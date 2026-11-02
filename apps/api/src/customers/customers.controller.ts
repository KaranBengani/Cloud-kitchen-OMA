import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateCustomerDto, UpdateCustomerDto } from './customer.dto.js';
import { CustomersService } from './customers.service.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  search(@Query('q') q?: string) {
    return this.customers.search(q);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.customers.get(id);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }
}
