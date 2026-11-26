import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Injectable,
  Module,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async enforceQuota(userId: string, feature: string) {
    const limit = Number(this.config.get<string>('AI_DAILY_REQUEST_LIMIT_PER_USER') || 25);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const usedToday = await this.prisma.aiUsageLog.count({
      where: { userId, createdAt: { gte: startOfDay } },
    });
    if (usedToday >= limit) {
      throw new HttpException(
        `Daily AI assistant limit (${limit} requests) reached. Please try again tomorrow.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.prisma.aiUsageLog.create({
      data: { userId, feature, tokensEst: 250 },
    });
  }

  async generateSuggestion(
    userId: string,
    body: {
      feature:
        | 'celebration_message'
        | 'invitation_content'
        | 'theme_recommendation'
        | 'faq_assistant'
        | 'order_summary';
      category?: string;
      honoreeNames?: string;
      eventDate?: string;
      question?: string;
    },
  ) {
    await this.enforceQuota(userId, body.feature);

    const apiKey = this.config.get<string>('AI_API_KEY');
    const names = body.honoreeNames || 'our beloved family';
    const category = body.category || 'Celebration';

    if (apiKey) {
      try {
        const prompt = `You are a luxury digital celebration copywriter for LB Digital Creations. Feature: ${body.feature}. Category: ${category}. Honorees: ${names}. Date: ${body.eventDate || 'upcoming'}. Question: ${body.question || ''}. Provide warm, elegant, concise editable copy.`;
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.get<string>('AI_MODEL') || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
          }),
        });
        if (resp.ok) {
          const json: any = await resp.json();
          const text = json.choices?.[0]?.message?.content;
          if (text) {
            return { editableSuggestion: text, provider: 'live-ai', requiresApproval: true };
          }
        }
      } catch {
        // Fall through to deterministic luxury copywriter
      }
    }

    const suggestions: Record<string, string> = {
      celebration_message: `With joyful hearts, we invite you to celebrate ${names} on this unforgettable ${category.toLowerCase()} milestone${body.eventDate ? ` on ${body.eventDate}` : ''}. Your presence, blessings, and warm wishes mean the world to us.`,
      invitation_content: `Together with our families, we cordially invite you to join the ${category} celebration of ${names}. Explore the event schedule, venue directions, and share your RSVP with a single tap.`,
      theme_recommendation: `Recommended Palette: Primary Gold (#C5A15A) paired with Ivory (#F8F7F4) and Champagne (#E6D5A8). Suggested Animation: Royal Curtain Reveal with Playfair Display headings.`,
      faq_assistant: `At LB Digital Creations, you start with a 50% advance payment, review your interactive preview with unlimited revisions until approved, and settle the remaining 50% balance to publish your celebration website live.`,
      order_summary: `Bespoke ${category} Celebration Website for ${names} featuring live countdown, curated photo gallery, venue navigation, and guest RSVP.`,
    };

    return {
      editableSuggestion:
        suggestions[body.feature] ||
        'Crafted with luxury gold and ivory elegance for your special moment.',
      provider: 'lbdc-curated-assistant',
      requiresApproval: true,
    };
  }
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('suggest')
  suggest(@CurrentUser() user: AuthUser, @Body() body: any) {
    if (!body?.feature) {
      throw new BadRequestException('AI feature type is required');
    }
    return this.ai.generateSuggestion(user.id, body);
  }
}

@Module({
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
