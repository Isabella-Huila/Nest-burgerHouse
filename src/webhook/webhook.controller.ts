import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Headers, UnauthorizedException } from '@nestjs/common';

import Stripe from 'stripe';
import { OrderService } from '../Order/order.service';

interface SelectedTopping {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

@Controller('webhook')
export class WebhookController {
  private stripe: Stripe;

  constructor(private readonly orderService: OrderService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }

  @Post("stripe")
  async activateOrder(
    @Req() req: Request,
    @Headers('stripe-signature') stripeSignature: string,
  ) {
    let event: any;
    const body = req.body!.toString();

    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        stripeSignature,
        process.env.STRIPE_SIGNATURE!
      );
    } catch (err) {
      console.log(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new UnauthorizedException(`Webhook Error: ${errorMessage}`);
    }

    const bodys = JSON.parse(body);
    const orderId = bodys.data.object.metadata.orderId;

    this.orderService.activateOrder(orderId);
    return { received: true };
  }

}
