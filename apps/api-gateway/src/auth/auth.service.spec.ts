import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let jwtService: {
    sign: jest.Mock;
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if email is already taken', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u-1',
        email: 'test@example.com',
      });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123',
          role: UserRole.USER,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should register a new user with hashed password', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockImplementation((dto) => ({
        id: 'new-uuid',
        ...dto,
        createdAt: new Date(),
      }));
      userRepo.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password123',
      });

      expect(result.message).toBe('User registered successfully');
      expect(result.user.email).toBe('new@example.com');
      expect(userRepo.save).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'notfound@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hash = await bcrypt.hash('CorrectPassword', 10);
      userRepo.findOne.mockResolvedValue({
        id: 'u-1',
        email: 'user@example.com',
        passwordHash: hash,
        role: UserRole.USER,
      });

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return an access token and user info on valid credentials', async () => {
      const hash = await bcrypt.hash('ValidPassword', 10);
      userRepo.findOne.mockResolvedValue({
        id: 'u-1',
        email: 'user@example.com',
        passwordHash: hash,
        role: UserRole.USER,
      });

      const res = await service.login({
        email: 'user@example.com',
        password: 'ValidPassword',
      });

      expect(res.accessToken).toBe('mocked-jwt-token');
      expect(res.user.email).toBe('user@example.com');
    });
  });
});
