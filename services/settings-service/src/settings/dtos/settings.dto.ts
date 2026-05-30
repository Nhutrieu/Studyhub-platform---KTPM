import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  key?: string;

  @IsObject()
  value!: {
    newsletter?: {
      title?: string;
      subtitle?: string;
      placeholder?: string;
      buttonText?: string;
      enabled?: boolean;
    };
    footer?: {
      about?: string;
      address?: string;
      phone?: string;
      email?: string;
      socialMedia?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
      };
      quickLinks?: Array<{ label: string; url: string }>;
      supportLinks?: Array<{ label: string; url: string }>;
      copyright?: string;
    };
    header?: {
      logoText?: string;
      logoUrl?: string;
      logoSvg?: string;
      searchPlaceholder?: string;
      showSearch?: boolean;
      navigationItems?: Array<{
        label: string;
        href: string;
        dropdown?: Array<{ label: string; href: string }>;
      }>;
    };
    hero?: {
      imageUrl?: string;
      title?: string;
      subtitle?: string;
      buttonText?: string;
      buttonLink?: string;
    };
  };
}

