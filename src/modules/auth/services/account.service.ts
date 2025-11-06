import { MailerService } from "@nestjs-modules/mailer";
import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { compareSync, hashSync } from "bcrypt";
import { nanoid } from "nanoid";
import { DataSource, Repository } from "typeorm";
import { SignInDto, SignUpDto } from "../dtos/auth.dto";
import { ChangePasswordDto, RequestPasswordResetDto, ResetPasswordWithCodeDto } from "../dtos/password.dto";
import { PasswordEntity } from "../entities/password.entity";
import { TokenEntity, TokenTypeEnum } from "../entities/token.entity";
import { UserEntity } from "../entities/user.entity";

const SALT_ROUND = 10;
const TOKEN_EXPIRATION = {
  PASSWORD_RESET: 3600, // 1 hour in seconds
};

/**
 * Account Service
 * Handles all user account operations including authentication, profile management, and password operations
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
    @InjectRepository(PasswordEntity) private passwordRepo: Repository<PasswordEntity>,
    @InjectRepository(TokenEntity) private userTokenRepo: Repository<TokenEntity>,
    private dataSource: DataSource,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) { }

  // ==================== User Authentication Methods ====================

  /**
   * Sign in with username/email and password
   */
  async signIn(dto: SignInDto): Promise<UserEntity> {
    const user = await this.userRepo.findOne({
      where: [
        { username: dto.username },
        { email: dto.username },
      ],
    });

    if (!user) {
      throw new UnauthorizedException("Not found user");
    }

    const userPassword = await this.passwordRepo.findOne({
      where: { userId: user.id },
    });

    const isPasswordMatch = userPassword && compareSync(dto.password, userPassword.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException("Username or password is not correct");
    }

    return user;
  }

  /**
   * Sign up new user with email and password
   */
  async signUp(dto: SignUpDto): Promise<UserEntity> {
    const { email, name } = dto;

    return this.dataSource.transaction(async (manager) => {
      const existingUser = await manager.findOne(UserEntity, {
        where: { email },
      });

      if (existingUser) {
        throw new BadRequestException("User with this email already exists");
      }

      const user = manager.create(UserEntity, {
        email,
        name,
      });
      await manager.save(user);

      const userPassword = manager.create(PasswordEntity, {
        user,
        password: hashSync(dto.password, SALT_ROUND),
      });
      await manager.save(userPassword);

      this.logger.log(`New user registered: ${email}`);

      return user;
    });
  }

  // ==================== User Profile Methods ====================

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<UserEntity | null> {
    const user = await this.userRepo.findOne({
      where: {
        id: userId,
      },
    });

    return user;
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { email },
    });
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updateData: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.userRepo.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    Object.assign(user, updateData);
    await user.save();

    return user;
  }

  /**
   * Change username
   */
  async changeUsername(userId: string, newUsername: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const existingUser = await this.userRepo.findOne({
      where: {
        username: newUsername,
      },
    });

    if (existingUser) {
      throw new BadRequestException("Username already exists");
    }

    user.username = newUsername;
    await user.save();

    return { message: "Username changed successfully" };
  }

  // ==================== Password Management Methods ====================

  /**
   * Get password info (last updated date)
   */
  async getPassword(userId: string): Promise<{ updatedAt: Date | null }> {
    let updatedAt: Date | null = null;

    const userPassword = await this.passwordRepo.findOne({
      where: {
        userId,
      },
    });

    if (userPassword) {
      updatedAt = userPassword.updatedAt;
    }

    return {
      updatedAt,
    };
  }

  /**
   * Create password for user who doesn't have one
   */
  async createPassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const userPassword = await this.passwordRepo.findOne({
      where: {
        userId,
      },
    });

    if (userPassword) {
      throw new BadRequestException("User already has password");
    }

    const newUserPassword = this.passwordRepo.create({
      userId,
      password: hashSync(dto.newPassword, SALT_ROUND),
    });

    await this.passwordRepo.insert(newUserPassword);

    return { message: "Password created successfully" };
  }

  /**
   * Change existing password
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const userPassword = await this.passwordRepo.findOne({
      where: {
        userId,
      },
    });

    if (!userPassword) {
      throw new BadRequestException("User does not have password");
    }

    const isPasswordMatch = compareSync(dto.oldPassword, userPassword.password);

    if (!isPasswordMatch) {
      throw new BadRequestException("Old password is not correct");
    }

    userPassword.password = hashSync(dto.newPassword, SALT_ROUND);
    await userPassword.save();

    this.logger.log(`Password changed for user: ${userId}`);

    return { message: "Password changed successfully" };
  }

  /**
   * Request password reset (send email with reset link)
   */
  async requestPasswordReset(dto: RequestPasswordResetDto, userEmail: string, userId: string): Promise<{ message: string }> {
    const userToken = this.userTokenRepo.create({
      userId,
      token: nanoid(64),
      tokenType: TokenTypeEnum.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRATION.PASSWORD_RESET * 1000),
    });

    await userToken.save();

    const code = `${userToken.id}$${userToken.token}`;
    const resetLink = new URL(dto.endpointUrl);
    resetLink.searchParams.append("code", code);

    try {
      await this.mailerService.sendMail({
        subject: "Password Reset",
        template: "password-reset.hbs",
        to: userEmail,
        context: {
          name: userEmail.split("@")[0],
          resetLink: resetLink.toString(),
        },
      });

      this.logger.log(`Password reset email sent to: ${userEmail}`);
    }
    catch (error) {
      this.logger.error("Failed to send password reset email", error instanceof Error ? error.stack : error);
      throw new BadRequestException("Failed to send reset email. Please try again later.");
    }

    return { message: "Password reset email sent successfully" };
  }

  /**
   * Reset password using code from email
   */
  async resetPasswordWithCode(dto: ResetPasswordWithCodeDto): Promise<{ message: string }> {
    const [tokenId, token] = dto.code.split("$");

    const userToken = await this.userTokenRepo.findOne({
      where: {
        id: tokenId,
      },
    });

    if (
      !userToken
      || userToken.token !== token
      || userToken.tokenType !== TokenTypeEnum.PASSWORD_RESET
      || userToken.expiresAt < new Date()
      || userToken.revoked
    ) {
      throw new BadRequestException("Invalid Code");
    }

    userToken.revoked = true;

    const userPassword = await this.passwordRepo.findOne({
      where: {
        userId: userToken.userId,
      },
    });

    if (!userPassword) {
      throw new BadRequestException("User does not have password");
    }

    userPassword.password = hashSync(dto.newPassword, SALT_ROUND);

    await Promise.all([userToken.save(), userPassword.save()]);

    return { message: "Password reset successfully" };
  }
}
