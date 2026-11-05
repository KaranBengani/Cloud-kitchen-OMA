import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { CreateOrderDto, PaymentInput, UpdateOrderDto, UpdateStatusDto } from './order.dto.js';
import { OrdersService } from './orders.service.js';

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('orders')
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.orders.list(from, to);
  }

  // Declared before orders/:id, so "requests" isn't read as an order id.
  @Get('orders/requests')
  requests() {
    return this.orders.requests();
  }

  @Get('orders/:id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.orders.get(id);
  }

  @Post('orders')
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  @Put('orders/:id')
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.orders.replace(id, dto);
  }

  @Patch('orders/:id/status')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.orders.setStatus(id, dto);
  }

  @Post('orders/:id/payments')
  addPayment(@Param('id', ParseIntPipe) id: number, @Body() dto: PaymentInput) {
    return this.orders.addPayment(id, dto);
  }

  @Delete('orders/:id/payments/:paymentId')
  deletePayment(@Param('id', ParseIntPipe) id: number, @Param('paymentId', ParseIntPipe) paymentId: number) {
    return this.orders.deletePayment(id, paymentId);
  }

  @Get('dues')
  dues() {
    return this.orders.dues();
  }
}
