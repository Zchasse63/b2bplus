'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Card, Button, Input, Textarea, Select, Modal, PageHeader } from '@/components/b2b';
import { toast } from '@/hooks/use-toast';
import { FiArrowLeft, FiSave, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import { productSchema } from '@/lib/validation/schemas';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
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
    } else if (isAdmin) {
      loadProduct();
    }
  }, [isAdmin, adminLoading]);

  async function loadProduct() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      toast({
        title: 'Error',
        description: 'Product not found',
        variant: 'destructive',
      });
      router.push('/admin/products');
      return;
    }

    setFormData({
      name: data.name || '',
      sku: data.sku || '',
      category: data.category || '',
      subcategory: data.subcategory || '',
      brand: data.brand || '',
      description: data.description || '',
      base_price: data.base_price?.toString() || '',
      unit_of_measure: data.unit_of_measure || 'case',
      units_per_case: data.units_per_case?.toString() || '',
      weight_lbs: data.weight_lbs?.toString() || '',
      in_stock: data.in_stock ? 'true' : 'false',
      image_url: data.image_url || '',
    });

    setLoading(false);
  }

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

      const { error } = await supabase
        .from('products')
        .update(dbData)
        .eq('id', params.id);

      if (error) throw error;

      setSuccessModal(true);
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from('products').delete().eq('id', params.id);

      if (error) throw error;

      router.push('/admin/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product. Please try again.',
        variant: 'destructive',
      });
      setDeleting(false);
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

  if (adminLoading || loading) {
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
              <h1 className="text-2xl font-bold text-navy-700 dark:text-white">Edit Product</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Update product information
              </p>
            </div>
          </div>
          <Button
            variant="primary" className="bg-red-500 hover:bg-red-600"
            size="sm"
            icon={<FiTrash2 />}
            onClick={() => setDeleteModal(true)}
          >
            Delete
          </Button>
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
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="SKU" name="sku" value={formData.sku} onChange={handleChange} required />
                  <Input label="Brand" name="brand" value={formData.brand} onChange={handleChange} />
                </div>
                <Textarea
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
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
                  />
                  <Input
                    label="Weight (lbs)"
                    name="weight_lbs"
                    type="number"
                    step="0.01"
                    value={formData.weight_lbs}
                    onChange={handleChange}
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
                    Save Changes
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
      <Modal isOpen={successModal} onClose={() => setSuccessModal(false)} title="Changes Saved!" size="sm">
        <div className="space-y-4 text-center">
          <FiCheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <p className="text-gray-700 dark:text-gray-300">Product has been updated successfully!</p>
          <Button variant="primary" className="w-full" onClick={() => setSuccessModal(false)}>
            Continue Editing
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Product" size="sm">
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete this product? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteModal(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600" onClick={handleDelete} loading={deleting}>
              Delete Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
