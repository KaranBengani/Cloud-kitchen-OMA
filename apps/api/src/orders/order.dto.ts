import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
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
import { Transform, Type } from 'class-transformer';
import { normalizePhone } from '../customers/customer.dto.js';
import { ADDRESS_LABELS, type AddressLabel } from '../customers/customer-address.entity.js';
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

  // Label for a parcel address that isn't in the customer's address book yet. Defaults to Home for
  // their first address, Other after that.
  @IsOptional()
  @IsIn(ADDRESS_LABELS)
  addressLabel?: AddressLabel;

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
  // 'requested' is only ever set by the web order form.
  @IsIn(ORDER_STATUSES.filter((st) => st !== 'requested'))
  status: Exclude<OrderStatus, 'requested'>;

  @IsInt()
  version: number;
}

// ---- Web order form (DECISIONS.md D19). Public, so every field is bounded. ----

export class WebAddressInput {
  @IsString()
  @Length(5, 500)
  address: string;

  @IsIn(ADDRESS_LABELS)
  label: AddressLabel;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  recipientName?: string | null;

  @IsOptional()
  @Transform(({ value }) => normalizePhone(value))
  @Matches(/^91[6-9]\d{9}$/, {
    message: 'recipientPhone must be a 10-digit Indian mobile number',
  })
  recipientPhone?: string | null;
}

export class WebOrderItemInput {
  @IsInt()
  menuItemId: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(1_000)
  qty: number;
}

export class WebOrderDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @Transform(({ value }) => normalizePhone(value))
  @Matches(/^91[6-9]\d{9}$/, { message: 'Enter a 10-digit mobile number' })
  phone: string;

  @IsIn(FULFILMENTS)
  fulfilment: Fulfilment;

  // Required for delivery, ignored for pickup.
  @ValidateIf((o: WebOrderDto) => o.fulfilment === 'parcel')
  @IsObject({ message: 'address is required for delivery' })
  @ValidateNested()
  @Type(() => WebAddressInput)
  address?: WebAddressInput;

  @Matches(DATE, { message: 'deliveryDate must be YYYY-MM-DD' })
  deliveryDate: string;

  @IsOptional()
  @Matches(TIME, { message: 'deliveryTime must be HH:MM' })
  deliveryTime?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string | null;

  @ValidateNested({ each: true })
  @Type(() => WebOrderItemInput)
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  items: WebOrderItemInput[];

  // Honeypot: hidden from people by CSS, so only bots fill it in.
  @IsOptional()
  @IsString()
  website?: string;
}
