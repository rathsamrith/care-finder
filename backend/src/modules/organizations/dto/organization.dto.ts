import { IsEmail, IsIn, IsString, Length } from 'class-validator';

// Invites never grant Owner - ownership is only ever changed by an existing Owner.
export class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsIn(['Admin', 'Manager'])
  role!: 'Admin' | 'Manager';
}

export class AcceptInviteDto {
  @IsString()
  @Length(32, 128)
  token!: string;
}

export class ChangeRoleDto {
  @IsIn(['Owner', 'Admin', 'Manager'])
  role!: 'Owner' | 'Admin' | 'Manager';
}
