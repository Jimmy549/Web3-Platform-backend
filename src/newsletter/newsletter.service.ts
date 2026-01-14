import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscriber, SubscriberDocument } from '../schemas/subscriber.schema';
import { SubscribeDto } from './dto/subscribe.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NewsletterService {
  private readonly brevoApiKey: string;
  private readonly brevoSenderEmail: string;
  private readonly brevoSenderName: string;

  constructor(
    @InjectModel(Subscriber.name) private subscriberModel: Model<SubscriberDocument>,
    private configService: ConfigService,
  ) {
    this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY') || '';
    this.brevoSenderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL') || '';
    this.brevoSenderName = this.configService.get<string>('BREVO_SENDER_NAME') || 'Web3 Platform';
  }

  async subscribe(subscribeDto: SubscribeDto): Promise<{ message: string; email: string }> {
    const { email } = subscribeDto;

    // Check if email already exists
    const existingSubscriber = await this.subscriberModel.findOne({ email });
    if (existingSubscriber) {
      throw new ConflictException('This email is already subscribed to our newsletter');
    }

    // Save to database
    const subscriber = new this.subscriberModel({
      email,
      status: 'active',
      subscribedAt: new Date(),
    });

    try {
      await subscriber.save();
    } catch (error) {
      throw new InternalServerErrorException('Failed to save subscription');
    }

    // Add to Brevo (optional - only if API key is provided)
    if (this.brevoApiKey && this.brevoApiKey.trim() !== '') {
      try {
        await this.addToBrevo(email);
        await this.sendConfirmationEmail(email);
      } catch (error) {
        console.error('Brevo API error:', error);
        // Don't throw error - subscription is already saved in DB
        // This allows the app to work even without Brevo configured
      }
    }

    return {
      message: 'Successfully subscribed to newsletter! Check your email for confirmation.',
      email,
    };
  }

  private async addToBrevo(email: string): Promise<void> {
    const url = 'https://api.brevo.com/v3/contacts';
    
    const data = {
      email,
      listIds: [2], // Default list ID, adjust as needed
      updateEnabled: true,
    };

    await axios.post(url, data, {
      headers: {
        'api-key': this.brevoApiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  private async sendConfirmationEmail(email: string): Promise<void> {
    // Read the email template from src directory in development
    const templatePath = path.join(process.cwd(), 'src', 'newsletter', 'templates', 'confirmation-email.html');
    let htmlContent = fs.readFileSync(templatePath, 'utf-8');
    
    // Replace template variable with actual frontend URL
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://web3-platform-three.vercel.app';
    htmlContent = htmlContent.replace('{{FRONTEND_URL}}', frontendUrl);

    const url = 'https://api.brevo.com/v3/smtp/email';
    
    const data = {
      sender: {
        name: this.brevoSenderName,
        email: this.brevoSenderEmail,
      },
      to: [
        {
          email,
        },
      ],
      subject: 'Welcome to Web3 Platform - Newsletter Subscription Confirmed! 🚀',
      htmlContent,
    };

    await axios.post(url, data, {
      headers: {
        'api-key': this.brevoApiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async getAllSubscribers(): Promise<Subscriber[]> {
    return this.subscriberModel.find().exec();
  }
}
