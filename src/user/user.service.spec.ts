import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PaginationDto } from '../commons/dto/pagination.dto';

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    fullName: 'Test User',
    isActive: true,
    roles: ['customer'],
    checkFieldsBeforeInsert: jest.fn(),
    checkFieldsBeforeUpdate: jest.fn(),
  };

  const mockLoginResponse = {
    user: {
      id: '1',
      email: 'test@example.com',
      fullName: 'Test User',
      isActive: true,
      roles: ['customer'],
      checkFieldsBeforeInsert: expect.any(Function),
      checkFieldsBeforeUpdate: expect.any(Function),
      select: {
        email: true,
        password: true,
        id: true,
      },
    },
    token: 'mockToken',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({
              ...dto,
              id: '1',
              isActive: true,
              roles: ['customer'],
            })),
            save: jest
              .fn()
              .mockImplementation((user) =>
                Promise.resolve({ ...user, id: '1' }),
              ),
            find: jest.fn().mockResolvedValue([mockUser]),
            findOne: jest.fn().mockImplementation((options) => {
              if (options.where.email === 'test@example.com') {
                return Promise.resolve({
                  ...mockUser,
                  select: { email: true, password: true, id: true },
                });
              }
              return Promise.resolve(null);
            }),
            findOneBy: jest.fn().mockImplementation(({ id, email }) => {
              if (id === '1' || email === 'test@example.com') {
                return Promise.resolve(mockUser);
              }
              return Promise.resolve(null);
            }),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn(() => {
              const queryBuilder = {
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockUser),
              } as unknown as SelectQueryBuilder<User>;
              return queryBuilder;
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mockToken'),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      jest.spyOn(bcrypt, 'hashSync').mockReturnValue('hashedPassword');

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashedPassword',
      });
      expect(userRepository.save).toHaveBeenCalled();

      // Verificación específica del usuario
      expect(result?.user).toEqual({
        email: 'test@example.com',
        fullName: 'Test User',
        id: '1',
        isActive: true,
        roles: ['customer'],
        password: undefined,
      });

      expect(result?.token).toBe('mockToken');
    });

    it('should throw BadRequestException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      jest.spyOn(userRepository, 'save').mockRejectedValue({ code: '23505' });

      await expect(service.create(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('should login a user with valid credentials', async () => {
      const loginUserDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(bcrypt, 'compareSync').mockReturnValue(true);

      const result = await service.login(loginUserDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginUserDto.email },
        select: { email: true, password: true, id: true },
      });
      expect(result).toEqual(mockLoginResponse);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginUserDto: LoginUserDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      await expect(service.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginUserDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      jest.spyOn(bcrypt, 'compareSync').mockReturnValue(false);

      await expect(service.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const paginationDto: PaginationDto = {
        limit: 10,
        offset: 0,
      };
      const result = await service.findAll(paginationDto);
      expect(result).toEqual([mockUser]);
      expect(userRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find a user by email', async () => {
      const result = await service.findOne('test@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should find a user by UUID', async () => {
      const result = await service.findOne('1');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(null);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      } as unknown as SelectQueryBuilder<User>;

      jest
        .spyOn(userRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto: UpdateUserDto = {
        fullName: 'Updated Name',
      };

      jest.spyOn(bcrypt, 'hashSync').mockReturnValue('newHashedPassword');

      const result = await service.update('test@example.com', updateUserDto);

      expect(userRepository.update).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        updateUserDto,
      );
      expect(result).toEqual({
        ...mockUser,
        fullName: 'Updated Name',
      });
    });

    it('should hash password if provided', async () => {
      const updateUserDto: UpdateUserDto = {
        password: 'newPassword',
      };

      jest.spyOn(bcrypt, 'hashSync').mockReturnValue('newHashedPassword');

      await service.update('test@example.com', updateUserDto);

      expect(bcrypt.hashSync).toHaveBeenCalledWith('newPassword', 10);
      expect(userRepository.update).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        { password: 'newHashedPassword' },
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());
      await expect(
        service.update('nonexistent@example.com', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      const result = await service.remove('test@example.com');
      expect(userRepository.delete).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result.message).toContain('deleted successfully');
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());
      await expect(service.remove('nonexistent@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
