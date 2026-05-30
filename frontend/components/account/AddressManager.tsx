"use client";

import { useState, useEffect, useCallback } from "react";
import { Address } from "@/lib/types";
import { useToast } from "@/hooks/useToast";
import { userService } from "@/services/userService";

export function AddressManager() {
  const { error: showError, success: showSuccess } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    street: "",
    ward: "",
    district: "",
    city: "",
    isDefault: false,
  });

  // Load addresses
  const loadAddresses = useCallback(async () => {
    try {
      const loadedAddresses = await userService.getAddresses();
      setAddresses(loadedAddresses);
    } catch (error) {
      console.error("[AddressManager] Load error:", error);
      showError("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleAddAddress = async () => {
    try {
      if (!formData.name || !formData.phone || !formData.street) {
        showError("Please fill in all required fields");
        return;
      }
      const newAddress = await userService.addAddress(formData);
      setAddresses([...addresses, newAddress]);
      resetForm();
      showSuccess("Address added successfully");
    } catch (error) {
      console.error("[AddressManager] Add error:", error);
      showError("Failed to add address");
    }
  };

  const handleUpdateAddress = async () => {
    if (!editingId) return;
    try {
      const updated = await userService.updateAddress(editingId, formData);
      setAddresses(addresses.map((a) => (a.id === editingId ? updated : a)));
      resetForm();
      showSuccess("Address updated successfully");
    } catch (error) {
      console.error("[AddressManager] Update error:", error);
      showError("Failed to update address");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await userService.deleteAddress(id);
      setAddresses(addresses.filter((a) => a.id !== id));
      showSuccess("Address deleted");
    } catch (error) {
      console.error("[AddressManager] Delete error:", error);
      showError("Failed to delete address");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await userService.setDefaultAddress(id);
      setAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === id })));
      showSuccess("Default address updated");
    } catch (error) {
      console.error("[AddressManager] Set default error:", error);
      showError("Failed to set default address");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      street: "",
      ward: "",
      district: "",
      city: "",
      isDefault: false,
    });
    setEditingId(null);
  };

  const editAddress = (address: Address) => {
    setFormData({
      name: address.name || "",
      phone: address.phone || "",
      street: address.street || "",
      ward: address.ward || "",
      district: address.district || "",
      city: address.city || "",
      isDefault: address.isDefault ?? false,
    });
    setEditingId(address.id || null);
  };

  if (loading)
    return <div className="text-center py-8">Loading addresses...</div>;

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? "Edit Address" : "Add New Address"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Street Address"
            value={formData.street}
            onChange={(e) =>
              setFormData({ ...formData, street: e.target.value })
            }
            className="border rounded px-3 py-2 col-span-2"
          />
          <input
            type="text"
            placeholder="Ward"
            value={formData.ward}
            onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="District"
            value={formData.district}
            onChange={(e) =>
              setFormData({ ...formData, district: e.target.value })
            }
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <label className="flex items-center gap-2 col-span-2">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) =>
                setFormData({ ...formData, isDefault: e.target.checked })
              }
            />
            <span>Set as default address</span>
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={editingId ? handleUpdateAddress : handleAddAddress}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {editingId ? "Update" : "Add"} Address
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Address List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Saved Addresses</h3>
        {addresses.length === 0 ? (
          <p className="text-gray-500">No addresses yet</p>
        ) : (
          addresses.map((address) => (
            <div
              key={address.id}
              className={`border rounded-lg p-4 ${
                address.isDefault ? "border-blue-500 bg-blue-50" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">{address.name}</p>
                  <p className="text-sm text-gray-600">{address.phone}</p>
                </div>
                {address.isDefault && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 mb-3">
                {address.street}, {address.ward}, {address.district},{" "}
                {address.city}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => editAddress(address)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Edit
                </button>
                {!address.isDefault && address.id && (
                  <button
                    onClick={() => handleSetDefault(address.id!)}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                  >
                    Set as Default
                  </button>
                )}
                {address.id && (
                  <button
                    onClick={() => handleDeleteAddress(address.id!)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
