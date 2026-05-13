import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { PaginationDto } from '../commons/dto/pagination.dto';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUser: User = {
    id: 'cd533345-f1f3-48c9-a62e-7dc2da50c8f8',
    email: 'test@example.com',
    password: 'hashedPassword',
    fullName: 'Test User',
    isActive: true,
    roles: ['customer'],
    checkFieldsBeforeInsert: jest.fn(),
    checkFieldsBeforeUpdate: jest.fn(),
  };

  const mockAdminUser: User = {
    ...mockUser,
    email: 'admin@example.com',
    roles: ['admin', 'customer'],
    checkFieldsBeforeInsert: jest.fn(),
    checkFieldsBeforeUpdate: jest.fn(),
  };

  const mockUserResponse = {
    user: {
      id: 'cd533345-f1f3-48c9-a62e-7dc2da50c8f8',
      email: 'test@example.com',
      fullName: 'Test User',
      isActive: true,
      roles: ['customer'],
    },
    token: 'jwt-token-example',
  };

  const mockUserService = {
    create: jest.fn().mockResolvedValue(mockUserResponse),
    login: jest.fn().mockResolvedValue(mockUserResponse),
    findAll: jest.fn().mockResolvedValue([mockUser, mockAdminUser]),
    findOne: jest.fn().mockImplementation((email) => {
      if (email === 'test@example.com') {
        return Promise.resolve(mockUser);
      }
      if (email === 'admin@example.com') {
        return Promise.resolve(mockAdminUser);
      }
      return Promise.reject(
        new NotFoundException(`User with identifier '${email}' not found`),
      );
    }),
    update: jest.fn().mockImplementation((email, updateUserDto) => {
      if (email === 'test@example.com' || email === 'admin@example.com') {
        return Promise.resolve({
          ...mockUser,
          ...updateUserDto,
          email,
        });
      }
      return Promise.reject(
        new NotFoundException(`User with identifier '${email}' not found`),
      );
    }),
    remove: jest.fn().mockImplementation((email) => {
      if (email === 'test@example.com' || email === 'admin@example.com') {
        return Promise.resolve({
          message: `User ${email} deleted successfully`,
        });
      }
      return Promise.reject(
        new NotFoundException(`User with identifier '${email}' not found`),
      );
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('jwt-token-example'),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'new@example.com',
        password: 'Password123',
        fullName: 'New User',
      };

      const result = await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('login', () => {
    it('should login a user with valid credentials', async () => {
      const loginUserDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = await controller.login(loginUserDto);

      expect(service.login).toHaveBeenCalledWith(loginUserDto);
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const paginationDto: PaginationDto = {
        limit: 10,
        offset: 0,
      };
      const result = await controller.findAll(paginationDto);

      expect(service.findAll).toHaveBeenCalledWith(paginationDto);
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockUser, mockAdminUser]);
    });
  });

  describe('getProfile', () => {
    it('should return the user profile', async () => {
      const result = controller.getProfile(mockUser);

      expect(result).toEqual(mockUser);
    });
  });

  describe('findOne', () => {
    it('should find a user by email', async () => {
      const result = await controller.findOne('test@example.com');

      expect(service.findOne).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValueOnce(
          new NotFoundException(
            `User with identifier 'nonexistent@example.com' not found`,
          ),
        );

      await expect(
        controller.findOne('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a user if admin', async () => {
      const updateUserDto: UpdateUserDto = {
        fullName: 'Updated Name',
      };

      const result = await controller.update(
        'test@example.com',
        updateUserDto,
        mockAdminUser,
      );

      expect(service.update).toHaveBeenCalledWith(
        'test@example.com',
        updateUserDto,
      );
      expect(result).toEqual({
        ...mockUser,
        fullName: 'Updated Name',
      });
    });

    it('should update own profile', async () => {
      const updateUserDto: UpdateUserDto = {
        fullName: 'Updated Name',
      };

      const result = await controller.update(
        'test@example.com',
        updateUserDto,
        mockUser,
      );

      expect(service.update).toHaveBeenCalledWith(
        'test@example.com',
        updateUserDto,
      );
      expect(result).toEqual({
        ...mockUser,
        fullName: 'Updated Name',
      });
    });

    it('should throw UnauthorizedException when updating other users as non-admin', async () => {
      const updateUserDto: UpdateUserDto = {
        fullName: 'Updated Name',
      };

      await expect(
        controller.update('admin@example.com', updateUserDto, mockUser),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not allow non-admin users to update roles', async () => {
      const updateUserDto: UpdateUserDto = {
        fullName: 'Updated Name',
        roles: ['admin', 'customer'], // Intentando actualizar roles
      };

      await controller.update('test@example.com', updateUserDto, mockUser);

      expect(service.update).toHaveBeenCalledWith('test@example.com', {
        fullName: 'Updated Name',
      });
    });

    it('should not allow non-admin users to update isActive', async () => {
      const updateUserDto: UpdateUserDto = {
        fullName: 'Updated Name',
        isActive: false,
      };

      await controller.update('test@example.com', updateUserDto, mockUser);

      expect(service.update).toHaveBeenCalledWith('test@example.com', {
        fullName: 'Updated Name',
      });
    });

    it('should allow admins to update roles', async () => {
      const updateUserDto: UpdateUserDto = {
        fullName: 'Updated Name',
        roles: ['admin', 'customer'],
      };

      await controller.update('test@example.com', updateUserDto, mockAdminUser);

      expect(service.update).toHaveBeenCalledWith(
        'test@example.com',
        updateUserDto,
      );
    });

    it('should not allow users to update password of other users', async () => {
      const updateUserDto: UpdateUserDto = {
        password: 'NewPassword123',
      };

      await controller.update('test@example.com', updateUserDto, mockAdminUser);

      expect(service.update).toHaveBeenCalledWith('test@example.com', {});
    });

    it('should allow users to update their own password', async () => {
      const updateUserDto: UpdateUserDto = {
        password: 'NewPassword123',
      };

      await controller.update('test@example.com', updateUserDto, mockUser);

      expect(service.update).toHaveBeenCalledWith('test@example.com', {
        password: 'NewPassword123',
      });
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      const result = await controller.remove('test@example.com');

      expect(service.remove).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({
        message: 'User test@example.com deleted successfully',
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValueOnce(
          new NotFoundException(
            `User with identifier 'nonexistent@example.com' not found`,
          ),
        );

      await expect(
        controller.remove('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
