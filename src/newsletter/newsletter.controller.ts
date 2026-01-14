import { Controller, Post, Body, Get, ValidationPipe } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto } from './dto/subscribe.dto';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  async subscribe(@Body(ValidationPipe) subscribeDto: SubscribeDto) {
    return this.newsletterService.subscribe(subscribeDto);
  }

  @Get('subscribers')
  async getAllSubscribers() {
    return this.newsletterService.getAllSubscribers();
  }
}
