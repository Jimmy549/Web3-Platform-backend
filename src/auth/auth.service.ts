import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { name, email, password } = signupDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.usersService.create({
      email,
      name,
      password: hashedPassword,
      isActive: true,
    });

    return this.login(user);
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

    // Check if user exists
    let user = await this.usersService.findByGoogleId(googleId);

    if (!user) {
      // Create new user
      user = await this.usersService.create({
        googleId,
        email,
        name,
        picture,
        isActive: true,
      });
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
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
