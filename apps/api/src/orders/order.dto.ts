import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  NotEquals,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MENU_UNITS, type MenuUnit } from '../menu/menu-item.entity.js';
import { FULFILMENTS, type Fulfilment, ORDER_STATUSES, type OrderStatus } from './order.entity.js';
import { PAYMENT_MODES, type PaymentMode } from './payment.entity.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// A line is either a menu item (menuItemId) or a custom, off-menu item (name + unit + unitPricePaise,
// no menuItemId; DECISIONS.md D14). Custom lines are not added to the menu.
const isCustom = (line: OrderItemInput) => line.menuItemId == null;

export class OrderItemInput {
  @IsOptional()
  @IsInt()
  menuItemId?: number | null;

  @ValidateIf(isCustom)
  @IsString()
  @Length(1, 120)
  name?: string;

  @ValidateIf(isCustom)
  @IsIn(MENU_UNITS)
  unit?: MenuUnit;

  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(10_000)
  qty: number;

  // Omit to charge the menu price. Required for a custom line.
  @ValidateIf((line: OrderItemInput) => isCustom(line) || line.unitPricePaise !== undefined)
  @IsInt()
  @Min(0)
  unitPricePaise?: number;
}

export class PaymentInput {
  // Negative for a refund (DECISIONS.md D12); zero is meaningless.
  @IsInt()
  @NotEquals(0)
  amountPaise: number;

  @IsIn(PAYMENT_MODES)
  mode: PaymentMode;

  // Defaults to today (IST) when omitted.
  @IsOptional()
  @Matches(DATE)
  paidOn?: string;

  @IsOptional()
  @IsBoolean()
  isAdvance?: boolean;

  @IsOptional()
  @IsString()
  note?: string | null;
}

// The full editable state of an order. Edits send the whole thing back (PUT semantics):
// simpler and safer than patching individual item rows.
export class OrderInput {
  @IsInt()
  customerId: number;

  @Matches(DATE, { message: 'deliveryDate must be YYYY-MM-DD' })
  deliveryDate: string;

  @IsOptional()
  @Matches(TIME, { message: 'deliveryTime must be HH:MM' })
  deliveryTime?: string | null;

  @IsIn(FULFILMENTS)
  fulfilment: Fulfilment;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  // Order-level discount in paise (DECISIONS.md D13); cannot exceed the items subtotal.
  @IsOptional()
  @IsInt()
  @Min(0)
  discountPaise?: number;

  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  items: OrderItemInput[];
}

export class CreateOrderDto extends OrderInput {
  // Advance taken while booking, saved in the same transaction as the order.
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentInput)
  advance?: PaymentInput;
}

export class UpdateOrderDto extends OrderInput {
  // The version the phone loaded; see DECISIONS.md D6.
  @IsInt()
  version: number;
}

export class UpdateStatusDto {
  @IsIn(ORDER_STATUSES)
  status: OrderStatus;

  @IsInt()
  version: number;
}
