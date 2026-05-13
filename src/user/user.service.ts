import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayload } from './interfaces/jwt.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { isUUID } from 'class-validator';
import { PaginationDto } from '../commons/dto/pagination.dto';

@Injectable()
export class UserService {
 
  private logger = new Logger('UserService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;

    try {
      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10)
      });

      await this.userRepository.save(user);
      delete user.password;

      return {
        user: user,
        token: this.getJwtToken({ id: user.id })
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    
    const user = await this.userRepository.findOne({
      where: { email },
      select: { email: true, password: true, id: true }
    });

    if (!user) 
      throw new UnauthorizedException(`User with email ${email} not found`);

    if (!bcrypt.compareSync(password, user.password!))
      throw new UnauthorizedException(`Email or password incorrect`);

    delete user.password;
    const token = this.getJwtToken({ id: user.id })
    console.log(token);
    return {
      user: user,
      token
    };
  }

    async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    
    const users = await this.userRepository.find({
      take: limit,
      skip: offset,
      select: ['id', 'email', 'fullName', 'isActive', 'roles'],
    });
    
    return users;
  }

  async findOne(term: string) {
    let user: User | null;

    if (isUUID(term)) {
      user = await this.userRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.userRepository.createQueryBuilder('user');

      user = await queryBuilder
        .where('user.email = :email OR user.fullName = :fullName', {
          email: term,
          fullName: term,
        })
        .getOne();
    }

    if (!user)
      throw new NotFoundException(`User with identifier '${term}' not found`);

    return user;
  }


  async update(email: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(email);
    
    try {
      if (updateUserDto.password) {
        updateUserDto.password = bcrypt.hashSync(updateUserDto.password, 10);
      }
      
      await this.userRepository.update({ email }, updateUserDto);
      
      return {
        ...user,
        ...updateUserDto
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(email: string) {
    const user = await this.findOne(email);
    await this.userRepository.delete({ email });
    return {
      message: `User ${user.email} deleted successfully`
    };
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }

  private handleExceptions(error: any) {
    if (error.code === "23505")
      throw new BadRequestException(error.detail);

    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}
