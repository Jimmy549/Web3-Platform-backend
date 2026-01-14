import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<any>,
  ) {}

  async signup(signupDto: SignupDto) {
    const { name, email, password } = signupDto;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user - let MongoDB handle duplicate key errors
    try {
      const user = await this.usersService.create({
        email,
        name,
        password: hashedPassword,
        isActive: true,
      });
      return this.login(user);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('User with this email already exists');
      }
      throw error;
    }
  }

  async loginWithPassword(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.login(user);
  }

  async validateGoogleUser(googleUser: any): Promise<any> {
    const { googleId, email, name, picture } = googleUser;

    // Check if user exists by googleId
    let user = await this.usersService.findByGoogleId(googleId);

    if (!user) {
      // Check if email already exists
      const existingEmail = await this.usersService.findByEmail(email);
      if (existingEmail) {
        // Update existing user with googleId
        user = await this.usersService.updateUser(existingEmail['_id'], {
          googleId,
          name,
          picture,
        });
      } else {
        // Create new user
        user = await this.usersService.create({
          googleId,
          email,
          name,
          picture,
          isActive: true,
        });
      }
    } else {
      // Update user info (in case profile changed)
      user = await this.usersService.updateUser(user['_id'], {
        name,
        picture,
      });
    }

    return user;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user._id,
      name: user.name,
      picture: user.picture,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      picture: user.picture,
    };
  }

  async resetDatabase() {
    return this.usersService.deleteAll();
  }

  async rebuildIndexes() {
    // Drop all indexes except _id
    await this.userModel.collection.dropIndexes();
    // Recreate indexes from schema
    await this.userModel.syncIndexes();
    return { message: 'Indexes rebuilt successfully' };
  }
}
