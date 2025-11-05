'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, Button, Input, Badge, DataTable, Modal, Select, Textarea } from '@/components/b2b';
import { FiUsers, FiSearch, FiPlus, FiMail, FiPhone, FiEdit, FiTrash2 } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  title: string | null;
  is_primary: boolean;
  organizations?: {
    name: string;
  };
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactModal, setContactModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'user',
    title: '',
    organization_id: '',
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveContact() {
    setSaving(true);

    try {
      if (selectedContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(formData)
          .eq('id', selectedContact.id);

        if (error) throw error;

        toast({
          title: 'Contact Updated',
          description: 'Contact has been updated successfully',
        });
      } else {
        // Create new contact
        const { error } = await supabase.from('contacts').insert(formData);

        if (error) throw error;

        toast({
          title: 'Contact Created',
          description: 'New contact has been created successfully',
        });
      }

      setContactModal(false);
      setSelectedContact(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'user',
        title: '',
        organization_id: '',
      });
      loadContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to save contact',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteContact(contactId: string) {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const { error } = await supabase.from('contacts').delete().eq('id', contactId);

      if (error) throw error;

      toast({
        title: 'Contact Deleted',
        description: 'Contact has been deleted successfully',
      });

      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive',
      });
    }
  }

  function openEditModal(contact: Contact) {
    setSelectedContact(contact);
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone || '',
      role: contact.role,
      title: contact.title || '',
      organization_id: contact.organization_id,
    });
    setContactModal(true);
  }

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.organizations?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (contact: Contact) => (
        <div>
          <p className="font-semibold text-b2b-text">
            {contact.first_name} {contact.last_name}
            {contact.is_primary && (
              <Badge variant="success" size="sm" className="ml-2">
                Primary
              </Badge>
            )}
          </p>
          {contact.title && <p className="text-sm text-b2b-gray-500">{contact.title}</p>}
        </div>
      ),
    },
    {
      key: 'organization',
      label: 'Organization',
      render: (contact: Contact) => (
        <span className="text-b2b-text">{contact.organizations?.name}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (contact: Contact) => (
        <div className="flex items-center gap-2">
          <FiMail className="h-4 w-4 text-b2b-gray-400" />
          <a href={`mailto:${contact.email}`} className="text-b2b-blue hover:underline">
            {contact.email}
          </a>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (contact: Contact) =>
        contact.phone ? (
          <div className="flex items-center gap-2">
            <FiPhone className="h-4 w-4 text-b2b-gray-400" />
            <a href={`tel:${contact.phone}`} className="text-b2b-blue hover:underline">
              {contact.phone}
            </a>
          </div>
        ) : (
          <span className="text-b2b-gray-400">-</span>
        ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (contact: Contact) => (
        <Badge
          variant={
            contact.role === 'decision_maker'
              ? 'success'
              : contact.role === 'influencer'
              ? 'info'
              : 'default'
          }
        >
          {contact.role.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (contact: Contact) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<FiEdit />} onClick={() => openEditModal(contact)} />
          <Button
            variant="ghost"
            size="sm"
            icon={<FiTrash2 />}
            onClick={() => handleDeleteContact(contact.id)}
          />
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-b2b-gray-500">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="mt-3 animate-fadeIn">
      <PageHeader
        title="Contact Management"
        subtitle="Manage customer contacts and relationships"
        icon={<FiUsers />}
        action={
          <Button
            variant="primary"
            icon={<FiPlus />}
            onClick={() => {
              setSelectedContact(null);
              setContactModal(true);
            }}
          >
            Add Contact
          </Button>
        }
      />

      <Card className="p-6 mt-5">
        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search contacts by name, email, or organization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<FiSearch />}
          />
        </div>

        {/* Contacts Table */}
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <FiUsers className="h-16 w-16 text-b2b-gray-300 mx-auto mb-4" />
            <p className="text-b2b-gray-500">
              {searchTerm ? 'No contacts found matching your search' : 'No contacts found'}
            </p>
          </div>
        ) : (
          <DataTable columns={columns} data={filteredContacts} />
        )}
      </Card>

      {/* Contact Modal */}
      <Modal
        isOpen={contactModal}
        onClose={() => {
          setContactModal(false);
          setSelectedContact(null);
        }}
        title={selectedContact ? 'Edit Contact' : 'Add New Contact'}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'decision_maker', label: 'Decision Maker' },
              { value: 'influencer', label: 'Influencer' },
              { value: 'user', label: 'User' },
            ]}
          />
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setContactModal(false);
                setSelectedContact(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSaveContact}
              loading={saving}
            >
              {selectedContact ? 'Update' : 'Create'} Contact
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

