import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message: 'password must contain at least one uppercase letter and one number',
  })
  newPassword: string;
}
