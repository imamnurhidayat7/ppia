'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface MemberDetailModalProps {
  member: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    role: string;
    membershipStatus: string;
    joinedDate: string;
  };
  onClose: () => void;
}

export default function MemberDetailModal({
  member,
  onClose,
}: MemberDetailModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [tempData, setTempData] = useState({
    name: member.name,
    email: member.email,
    phone: member.phone,
    address: member.address,
    role: member.role,
  });

  const handleSave = () => {
    // TODO: Implement save logic (API call)
    console.log('Saving member:', tempData);
    setEditMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold">{member.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {editMode ? (
            {/* Edit Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  defaultValue={tempData.name}
                  onChange={(e) => setTempData({ ...tempData, name: e.target.value })}
                  disabled={editMode}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  defaultValue={tempData.email}
                  onChange={(e) => setTempData({ ...tempData, email: e.target.value })}
                  disabled={editMode}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  defaultValue={tempData.phone}
                  onChange={(e) => setTempData({ ...tempData, phone: e.target.value })}
                  disabled={editMode}
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  defaultValue={tempData.address}
                  onChange={(e) => setTempData({ ...tempData, address: e.target.value })}
                  disabled={editMode}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Input
                  id="edit-role"
                  defaultValue={tempData.role}
                  onChange={(e) => setTempData({ ...tempData, role: e.target.value }))
                  disabled={editMode}
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </form>
          ) : (
            {/* View Mode */}
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-gray-500">Name</p>
                <p className="text-gray-800">{member.name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-500">Email</p>
                <p className="text-gray-800">{member.email}</p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-500">Phone</p>
                <p className="text-gray-800">{member.phone}</p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-500">Address</p>
                <p className="text-gray-800">{member.address}</p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-500">Role</p>
                <p className="text-gray-800">{member.role}</p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-500">Membership Status</p>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${member.membershipStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    member.membershipStatus === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-800' :
                    member.membershipStatus === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'}`}
                >
                  {member.membershipStatus}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-gray-500">Joined Date</p>
                <p className="text-gray-800">{new Date(member.joinedDate).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}