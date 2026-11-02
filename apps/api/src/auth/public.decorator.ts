import { SetMetadata } from '@nestjs/common';

// Every route needs a valid token unless it's marked @Public().
export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
