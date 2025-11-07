'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { DataTable, Button, Modal, Card, PageHeader } from '@/components/b2b';
import { FiPlus, FiEdit, FiTrash2, FiUpload, FiEye } from 'react-icons/fi';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string | null;
  base_price: number;
  stock_quantity: number | null;
  image_url: string | null;
  created_at: string;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; product?: Product }>({
    open: false,
  });
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      loadProducts();
    }
  }, [isAdmin, adminLoading, router, page]);

  async function loadProducts() {
    const supabase = createClient();

    // Get total count
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (count !== null) {
      setTotalCount(count);
    }

    // Get paginated data
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  }

  async function handleDelete(product: Product) {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('products').delete().eq('id', product.id);

    if (!error) {
      setProducts(products.filter((p) => p.id !== product.id));
      setDeleteModal({ open: false });
    }
    setDeleting(false);
  }

  const columns = [
    {
      key: 'image_url',
      header: 'Image',
      render: (product: Product) => (
        <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-gray-100 dark:bg-navy-700">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <FiEye className="h-6 w-6" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      render: (product: Product) => (
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{product.sku}</span>
      ),
    },
    {
      key: 'name',
      header: 'Product Name',
      sortable: true,
      render: (product: Product) => (
        <div className="font-medium text-navy-700 dark:text-white">{product.name}</div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
    },
    {
      key: 'base_price',
      header: 'Price',
      sortable: true,
      render: (product: Product) => (
        <span className="font-semibold text-green-600 dark:text-green-400">
          ${product.base_price.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'stock_quantity',
      header: 'Stock',
      sortable: true,
      render: (product: Product) => {
        const stock = product.stock_quantity ?? 0;
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
              stock > 10
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : stock > 0
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {stock}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product: Product) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<FiEdit />}
            onClick={() => router.push(`/admin/products/${product.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<FiTrash2 />}
            onClick={() => setDeleteModal({ open: true, product })}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (adminLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mt-3 animate-fadeIn">
      {/* Header Card */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-700 dark:text-white">
              Product Management
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage your product catalog, inventory, and pricing
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              icon={<FiUpload />}
              onClick={() => router.push('/admin/products/import')}
            >
              Import CSV
            </Button>
            <Button
              variant="primary"
              icon={<FiPlus />}
              onClick={() => router.push('/admin/products/new')}
            >
              Add Product
            </Button>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <DataTable
        data={products}
        columns={columns}
      />

      {/* Pagination Controls */}
      {totalCount > pageSize && (
        <Card className="mt-5 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} products
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1)
                  .filter(p => {
                    // Show first page, last page, current page, and pages around current
                    return p === 1 ||
                           p === Math.ceil(totalCount / pageSize) ||
                           (p >= page - 1 && p <= page + 1);
                  })
                  .map((p, i, arr) => {
                    // Add ellipsis if there's a gap
                    const showEllipsis = i > 0 && p - arr[i - 1] > 1;
                    return (
                      <div key={p} className="flex items-center gap-1">
                        {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                        <Button
                          variant={p === page ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => setPage(p)}
                          className="min-w-[40px]"
                        >
                          {p}
                        </Button>
                      </div>
                    );
                  })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false })}
        title="Delete Product"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{deleteModal.product?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal({ open: false })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary" className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteModal.product && handleDelete(deleteModal.product)}
              loading={deleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
