import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
}

@Injectable()
export class UsersService {
  private users: User[] = [
    {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      password: '$2a$10$N9qo8uLOickgx2ZMRZoMpOIpnqe5Nc5.l9efvBu8kq8zrLLGn9qO6', // password: 'admin123'
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      username: 'testuser',
      email: 'test@example.com',
      password: '$2a$10$N9qo8uLOickgx2ZMRZoMpOIpnqe5Nc5.l9efvBu8kq8zrLLGn9qO6', // password: 'admin123'
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  async findAll(page: number = 1, limit: number = 10, search?: string): Promise<{ users: Omit<User, 'password'>[]; total: number; page: number; limit: number }> {
    let filteredUsers = this.users;
    
    if (search) {
      filteredUsers = this.users.filter(user => 
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = filteredUsers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const users = filteredUsers
      .slice(startIndex, endIndex)
      .map(({ password, ...user }) => user);

    return { users, total, page, limit };
  }

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = this.users.find(u => u.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...result } = user;
    return result;
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const newUser: User = {
      id: uuidv4(),
      ...createUserDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.users.push(newUser);
    return newUser;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new NotFoundException('User not found');
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updateUserDto,
      updatedAt: new Date(),
    };

    const { password, ...result } = this.users[userIndex];
    return result;
  }

  async remove(id: string): Promise<void> {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new NotFoundException('User not found');
    }

    this.users.splice(userIndex, 1);
  }
}
