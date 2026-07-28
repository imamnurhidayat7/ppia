'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MemberDetailModal } from '@/components/ui/member/MemberDetailModal';

export default function AdminMembersPage() {
  const [members, setMembers] = useState([]);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    // Fetch members from API
    fetch('/api/members')
      .then(res => res.json())
      .then(data => setMembers(data))
      .catch(console.error);
  }, []);

  const handleOpenMemberDetail = (member) => {
    setSelectedMember(member);
    setShowMemberDetail(true);
  };

  const handleCloseMemberDetail = () => {
    setShowMemberDetail(false);
    setSelectedMember(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Members</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Name</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Email</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Phone</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Membership Status</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Role</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b whitespace-nowrap">{member.name}</td>
                <td className="py-2 px-4 border-b whitespace-nowrap">{member.email}</td>
                <td className="py-2 px-4 border-b whitespace-nowrap">{member.phone}</td>
                <td className="py-2 px-4 border-b whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${member.membershipStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      member.membershipStatus === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'}`}>
                    {member.membershipStatus}
                  </span>
                </td>
                <td className="py-2 px-4 border-b whitespace-nowrap">{member.role}</td>
                <td className="py-2 px-4 border-b whitespace-nowrap text-sm font-medium">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenMemberDetail(member)}
                  >
                    View Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Member Detail Modal */}
      {showMemberDetail && selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={handleCloseMemberDetail}
        />
      )}
    </div>
  );
}