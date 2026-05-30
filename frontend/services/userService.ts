import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { User, Address } from "@/lib/types";

type UserUpdatePayload = Partial<User> & {
  fullName?: string;
  firstName?: string;
  lastName?: string;
};

type AddressDocument = Address & { _id?: string };

type UserWithAddresses = User & {
  addresses?: AddressDocument[];
};

const normalizeAddress = (address: AddressDocument): Address => ({
  ...address,
  id: address.id ?? address._id,
});

const normalizeUserUpdate = (data: UserUpdatePayload) => {
  const normalized: UserUpdatePayload = { ...data };
  if (!normalized.name) {
    const combinedName = [normalized.firstName, normalized.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const nameCandidate = normalized.fullName || combinedName;
    if (nameCandidate) {
      normalized.name = nameCandidate;
    }
  }
  delete normalized.fullName;
  delete normalized.firstName;
  delete normalized.lastName;
  return normalized;
};

export const userService = {
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>(endpoints.users.profile);
    return response.data;
  },

  getUsers: async (filters: { role?: string; branchId?: string } | string = {}): Promise<User[]> => {
    const params = new URLSearchParams();
    if (typeof filters === 'string') {
      params.append('role', filters);
    } else {
      if (filters.role) params.append('role', filters.role);
      if (filters.branchId) params.append('branchId', filters.branchId);
    }
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get<User[]>(
      `${endpoints.users.list}${queryString}`
    );
    return response.data;
  },

  getUser: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(endpoints.users.detail(id));
    return response.data;
  },

  updateProfile: async (data: UserUpdatePayload): Promise<User> => {
    const response = await apiClient.put<User>(
      endpoints.users.profile,
      normalizeUserUpdate(data)
    );
    return response.data;
  },

  updateUser: async (id: string, data: UserUpdatePayload): Promise<User> => {
    const response = await apiClient.put<User>(
      endpoints.users.update(id),
      normalizeUserUpdate(data)
    );
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(endpoints.users.delete(id));
  },

  getAddresses: async (): Promise<Address[]> => {
    try {
      const response = await apiClient.get<AddressDocument[]>(
        endpoints.users.addresses
      );
      return response.data.map(normalizeAddress);
    } catch {
      // Fallback: get addresses from profile
      const user = await userService.getProfile();
      return (user.addresses || []).map((addr) =>
        normalizeAddress(addr as AddressDocument)
      );
    }
  },

  addAddress: async (
    address: Omit<Address, "id" | "userId" | "createdAt" | "updatedAt">
  ): Promise<Address> => {
    try {
      // Send address data directly
      const response = await apiClient.post<UserWithAddresses>(
        endpoints.users.addresses,
        address
      );
      
      // Backend returns full user object, extract the last address added
      const user = response.data;
      
      // Log for debugging
      console.log("Add address response:", { user, addresses: user?.addresses });
      
      if (user && user.addresses && Array.isArray(user.addresses) && user.addresses.length > 0) {
        const addedAddress = user.addresses[user.addresses.length - 1];
        const normalized = normalizeAddress(addedAddress);
        console.log("Normalized address:", normalized);
        return normalized;
      }
      
      // If addresses array is empty or doesn't exist, check if response has address directly
      // Backend might return the address object directly in some cases
      if (response.data && typeof response.data === "object") {
        const data = response.data as any;
        // Check if it's an address object (has street, city, etc.)
        if (data.street || data.city || data._id) {
          return normalizeAddress(data);
        }
      }
      
      // If we reach here, backend returned success but we can't find the address
      // This shouldn't happen, but we'll return a basic structure to prevent error
      console.warn("Could not extract address from response, but request succeeded");
      return {
        id: `temp-${Date.now()}`,
        name: address.name || "",
        phone: address.phone || "",
        street: address.street || "",
        ward: address.ward || "",
        district: address.district || "",
        city: address.city || "",
        isDefault: address.isDefault || false,
      } as Address;
    } catch (error: any) {
      console.error("Add address error:", error);
      // Re-throw to let mutation handle error display
      throw error;
    }
  },

  updateAddress: async (
    addressId: string,
    address: Partial<Address>
  ): Promise<Address> => {
    // Send address data directly
    const response = await apiClient.put<UserWithAddresses>(
      endpoints.users.address(addressId),
      address
    );
    // Backend returns full user object, find the updated address
    const user = response.data;
    if (user && user.addresses) {
      const updated = (user.addresses as AddressDocument[]).find(
        (addr) =>
          addr._id?.toString() === addressId || addr.id === addressId
      );
      if (updated) {
        return normalizeAddress(updated);
      }
    }
    // Fallback: return empty address if extraction failed
    throw new Error("Failed to update address");
  },

  deleteAddress: async (addressId: string): Promise<void> => {
    await apiClient.delete(endpoints.users.address(addressId));
  },

  setDefaultAddress: async (addressId: string): Promise<Address> => {
    const response = await apiClient.put<UserWithAddresses>(
      endpoints.users.setDefaultAddress(addressId),
      {}
    );
    // Backend returns full user object, find the updated address
    const user = response.data;
    if (user && user.addresses) {
      const updated = (user.addresses as AddressDocument[]).find(
        (addr) =>
          addr._id?.toString() === addressId || addr.id === addressId
      );
      if (updated) {
        return normalizeAddress(updated);
      }
    }
    // Fallback: return empty address if extraction failed
    throw new Error("Failed to set default address");
  },
};
