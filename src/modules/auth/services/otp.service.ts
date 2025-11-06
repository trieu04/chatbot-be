import { Injectable, BadRequestException, UnauthorizedException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "node:crypto";
import { OtpRepository } from "../repositories/otp.repository";
import { UserRepository } from "../repositories/user.repository";
import { SecurityLogRepository } from "../repositories/security-log.repository";
import { OtpMethodEnum } from "../entities/otp.entity";
import { SecurityActionEnum } from "../entities/security-log.entity";
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly otpRepository: OtpRepository,
    private readonly userRepository: UserRepository,
    private readonly securityLogRepository: SecurityLogRepository,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a 6-digit OTP code
   */
  private generateOtpCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Hash OTP code for secure storage
   */
  private hashOtpCode(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
  }

  /**
   * Request OTP via email
   */
  async requestEmailOtp(email: string, ipAddress?: string, userAgent?: string): Promise<{ message: string }> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Generate OTP code
    const otpCode = this.generateOtpCode();
    const hashedCode = this.hashOtpCode(otpCode);

    // Store OTP in database
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    // Deactivate any existing email OTPs for this user
    const existingOtps = await this.otpRepository.findByUserId(user.id);
    for (const existingOtp of existingOtps) {
      if (existingOtp.otpMethod === OtpMethodEnum.EMAIL) {
        await this.otpRepository.deactivate(existingOtp.id);
      }
    }

    // Create new OTP record
    await this.otpRepository.create({
      userId: user.id,
      otpMethod: OtpMethodEnum.EMAIL,
      otpSecret: hashedCode,
      email,
      verified: false,
      active: true,
    });

    // Send OTP via email
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: "Your OTP Code",
        template: "otp.hbs",
        context: {
          otpCode,
          expiryMinutes: this.OTP_EXPIRY_MINUTES,
        },
      });
    }
    catch (error) {
      this.logger.error(`Failed to send OTP email: ${error.message}`);
      throw new BadRequestException("Failed to send OTP email");
    }

    // Log security event
    await this.securityLogRepository.logAction(
      SecurityActionEnum.LOGIN,
      user.id,
      {
        success: true,
        ipAddress,
        userAgent,
        additionalData: { otpMethod: "email" },
      },
    );

    this.logger.log(`OTP sent to email: ${email}`);

    return { message: "OTP sent successfully" };
  }

  /**
   * Request OTP via SMS
   */
  async requestSmsOtp(_phoneNumber: string, _ipAddress?: string, _userAgent?: string): Promise<{ message: string }> {
    // TODO: Implement SMS OTP if needed
    // For now, throw an error
    throw new BadRequestException("SMS OTP not yet implemented");
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(
    userId: string,
    code: string,
    method: OtpMethodEnum,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    // Find active OTP for user and method
    const otp = await this.otpRepository.findActiveByUserIdAndMethod(userId, method);

    if (!otp) {
      await this.securityLogRepository.logAction(
        SecurityActionEnum.LOGIN_FAILED,
        userId,
        {
          success: false,
          failureReason: "No active OTP found",
          ipAddress,
          userAgent,
        },
      );
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    // Check if OTP has expired
    if (otp.createdAt) {
      const expiryTime = new Date(otp.createdAt);
      expiryTime.setMinutes(expiryTime.getMinutes() + this.OTP_EXPIRY_MINUTES);

      if (new Date() > expiryTime) {
        await this.otpRepository.deactivate(otp.id);
        await this.securityLogRepository.logAction(
          SecurityActionEnum.LOGIN_FAILED,
          userId,
          {
            success: false,
            failureReason: "OTP expired",
            ipAddress,
            userAgent,
          },
        );
        throw new UnauthorizedException("OTP has expired");
      }
    }

    // Verify OTP code
    const hashedCode = this.hashOtpCode(code);
    if (otp.otpSecret !== hashedCode) {
      await this.securityLogRepository.logAction(
        SecurityActionEnum.LOGIN_FAILED,
        userId,
        {
          success: false,
          failureReason: "Invalid OTP code",
          ipAddress,
          userAgent,
        },
      );
      throw new UnauthorizedException("Invalid OTP code");
    }

    // Mark OTP as verified and deactivate
    await this.otpRepository.markAsVerified(otp.id);
    await this.otpRepository.deactivate(otp.id);

    // Log successful verification
    await this.securityLogRepository.logAction(
      SecurityActionEnum.LOGIN,
      userId,
      {
        success: true,
        ipAddress,
        userAgent,
        additionalData: { otpMethod: method },
      },
    );

    this.logger.log(`OTP verified successfully for user: ${userId}`);
    return { message: "OTP verified successfully" };
  }

  /**
   * Enable TOTP (Time-based OTP) for a user
   */
  async enableTotp(_userId: string): Promise<{ secret: string; qrCode: string }> {
    // TODO: Implement TOTP using speakeasy or similar library
    throw new BadRequestException("TOTP not yet implemented");
  }

  /**
   * Verify TOTP code
   */
  async verifyTotp(_userId: string, _code: string): Promise<{ message: string }> {
    // TODO: Implement TOTP verification
    throw new BadRequestException("TOTP not yet implemented");
  }

  /**
   * Disable TOTP for a user
   */
  async disableTotp(_userId: string, _code: string): Promise<{ message: string }> {
    // TODO: Implement TOTP disable after verifying current code
    throw new BadRequestException("TOTP not yet implemented");
  }
}
