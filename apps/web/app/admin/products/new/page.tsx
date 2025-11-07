'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Card, Button, Input, Textarea, Select, Modal, PageHeader } from '@/components/b2b';
import { toast } from '@/hooks/use-toast';
import { FiArrowLeft, FiSave, FiCheckCircle } from 'react-icons/fi';
import { productSchema } from '@/lib/validation/schemas';

export default function NewProductPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [saving, setSaving] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    subcategory: '',
    brand: '',
    description: '',
    base_price: '',
    unit_of_measure: 'case',
    units_per_case: '',
    weight_lbs: '',
    in_stock: 'true',
    image_url: '',
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();

      // Prepare data for validation
      const productData = {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        brand: formData.brand || undefined,
        description: formData.description,
        basePrice: parseFloat(formData.base_price),
        unitOfMeasure: formData.unit_of_measure as 'case' | 'each' | 'box' | 'pound' | 'kilogram' | 'liter' | 'gallon',
        unitsPerCase: formData.units_per_case ? parseInt(formData.units_per_case) : undefined,
        weightLbs: formData.weight_lbs ? parseFloat(formData.weight_lbs) : undefined,
        inStock: formData.in_stock === 'true',
        imageUrl: formData.image_url || undefined,
        isActive: true,
      };

      // Validate with Zod
      const validation = productSchema.safeParse(productData);

      if (!validation.success) {
        const fieldErrors = validation.error.flatten().fieldErrors;
        const errorMessages = Object.entries(fieldErrors)
          .map(([field, errors]) => `${field}: ${errors?.[0]}`)
          .join(', ');

        toast({
          title: 'Validation Error',
          description: errorMessages,
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      // Use validated data
      const validatedData = validation.data;

      // Convert back to database column names
      const dbData = {
        name: validatedData.name,
        sku: validatedData.sku,
        category: validatedData.category,
        subcategory: validatedData.subcategory || null,
        brand: validatedData.brand || null,
        description: validatedData.description,
        base_price: validatedData.basePrice,
        unit_of_measure: validatedData.unitOfMeasure,
        units_per_case: validatedData.unitsPerCase || null,
        weight_lbs: validatedData.weightLbs || null,
        in_stock: validatedData.inStock,
        is_active: validatedData.isActive,
        image_url: validatedData.imageUrl || null,
      };

      const { data, error } = await supabase.from('products').insert(dbData).select().single();

      if (error) throw error;

      setNewProductId(data.id);
      setSuccessModal(true);
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to create product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = [
    { value: '', label: 'Select Category' },
    { value: 'Disposable Plates', label: 'Disposable Plates' },
    { value: 'Disposable Cups', label: 'Disposable Cups' },
    { value: 'Disposable Cutlery', label: 'Disposable Cutlery' },
    { value: 'Food Containers', label: 'Food Containers' },
    { value: 'Napkins', label: 'Napkins' },
    { value: 'Other', label: 'Other' },
  ];

  const unitOptions = [
    { value: 'case', label: 'Case' },
    { value: 'box', label: 'Box' },
    { value: 'pack', label: 'Pack' },
    { value: 'each', label: 'Each' },
  ];

  const stockOptions = [
    { value: 'true', label: 'In Stock' },
    { value: 'false', label: 'Out of Stock' },
  ];

  if (adminLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              icon={<FiArrowLeft />}
              onClick={() => router.push('/admin/products')}
            />
            <div>
              <h1 className="text-2xl font-bold text-navy-700 dark:text-white">Add New Product</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Create a new product in the catalog
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Main Info */}
          <div className="space-y-5 lg:col-span-2">
            <Card padding="lg">
              <h2 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">
                Basic Information
              </h2>
              <div className="space-y-4">
                <Input
                  label="Product Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 10oz Disposable Cups"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="SKU"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    required
                    placeholder="e.g., CUP-10OZ-100"
                  />
                  <Input
                    label="Brand"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    placeholder="e.g., Dart"
                  />
                </div>
                <Textarea
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Detailed product description..."
                />
              </div>
            </Card>

            <Card padding="lg">
              <h2 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">
                Category & Classification
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Category"
                  name="category"
                  options={categoryOptions}
                  value={formData.category}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Subcategory"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  placeholder="e.g., Hot Cups"
                />
              </div>
            </Card>

            <Card padding="lg">
              <h2 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">
                Product Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Units per Case"
                    name="units_per_case"
                    type="number"
                    value={formData.units_per_case}
                    onChange={handleChange}
                    placeholder="e.g., 100"
                  />
                  <Input
                    label="Weight (lbs)"
                    name="weight_lbs"
                    type="number"
                    step="0.01"
                    value={formData.weight_lbs}
                    onChange={handleChange}
                    placeholder="e.g., 5.5"
                  />
                  <Select
                    label="Unit of Measure"
                    name="unit_of_measure"
                    options={unitOptions}
                    value={formData.unit_of_measure}
                    onChange={handleChange}
                  />
                </div>
                <Input
                  label="Image URL"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </Card>
          </div>

          {/* Pricing & Stock */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">
                Pricing & Inventory
              </h2>
              <div className="space-y-4">
                <Input
                  label="Base Price"
                  name="base_price"
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                />
                <Select
                  label="Stock Status"
                  name="in_stock"
                  options={stockOptions}
                  value={formData.in_stock}
                  onChange={handleChange}
                />
                <div className="mt-6 space-y-3 border-t border-gray-200 pt-6 dark:border-white/10">
                  <Button type="submit" variant="primary" className="w-full" loading={saving}>
                    <FiSave className="mr-2" />
                    Create Product
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/admin/products')}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </form>

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        onClose={() => {}}
        title="Product Created!"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <FiCheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <p className="text-gray-700 dark:text-gray-300">
            Product has been created successfully!
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/admin/products')}
            >
              Back to Products
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => router.push(`/admin/products/${newProductId}/edit`)}
            >
              Edit Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
