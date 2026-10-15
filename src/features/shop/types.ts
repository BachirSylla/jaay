import type { ShopRole } from "@/lib/permissions";

export type CurrentUser = { id: string; email: string | null; fullName: string };

export type ShopSummary = { id: string; name: string; slug: string; role: ShopRole };

export type ShopDetails = {
  id: string;
  name: string;
  slug: string;
  whatsappPhone: string | null;
  showPublicPrices: boolean;
  catalogEnabled: boolean;
  currency: string;
  logoPath: string | null;
};

export type ShopContext = {
  user: CurrentUser;
  shop: ShopDetails;
  role: ShopRole;
  shops: ShopSummary[];
};

export type Member = {
  userId: string;
  fullName: string;
  email: string | null;
  role: ShopRole;
  createdAt: string;
};
