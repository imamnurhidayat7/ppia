'use client';

import { useMemo } from 'react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { getImageUrl } from '@/lib/utils';

interface MemberDetailModalProps {
  member: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    membershipStatus: string;
    role: string;
    joinedDate?: string;
    createdAt?: string;
    fileUrl?: string;
    documentUrl?: string;
    uploadUrl?: string;
    attachment?: { url?: string };
    files?: { url?: string }[];
    [key: string]: any;
  };
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
}

export default function MemberDetailModal({ member, onClose, onApprove, onReject }: MemberDetailModalProps) {
  const previewUrl = useMemo(() => {
    return member.fileUrl || member.documentUrl || member.uploadUrl || member.attachment?.url || (member.files && member.files[0]?.url) || null;
  }, [member]);

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isPdf = (url: string) => /\.pdf$/i.test(url);

  return (
    <Modal isOpen={true} onClose={onClose} title={`${member.name}'s Details`} description="Member information">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Basic Information</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-300">
            <div>
              <div className="text-xs text-slate-500">Name</div>
              <div className="font-medium">{member.name}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Email</div>
              <div className="break-all">{member.email}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Phone</div>
              <div>{member.phone || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Role</div>
              <div className="capitalize">{member.role}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-slate-500">Address</div>
              <div className="break-all">{member.address || '-'}</div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Membership</h3>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Status</div>
              <div className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${member.membershipStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' : member.membershipStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : member.membershipStatus === 'INACTIVE' ? 'bg-red-100 text-red-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                {member.membershipStatus}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Joined</div>
              <div className="mt-1">{member.joinedDate ? new Date(member.joinedDate).toLocaleDateString() : (member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-')}</div>
            </div>
          </div>
        </div>

        {/* File preview */}
        {previewUrl && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Uploaded File</h3>
            <div className="mt-3">
              {isImage(previewUrl) ? (
                <img src={getImageUrl(previewUrl)} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border border-slate-100" />
              ) : isPdf(previewUrl) ? (
                <iframe src={getImageUrl(previewUrl)} className="w-full h-64 border rounded-lg" title="Document preview" />
              ) : (
                <a href={getImageUrl(previewUrl)} target="_blank" rel="noreferrer" className="text-sm text-sky-600 underline">Open file</a>
              )}
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <div className="flex items-center justify-end gap-3 w-full">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">Close</button>
          {member.membershipStatus === 'PENDING' && (
            <>
              <button onClick={() => onReject?.(member.id, '')} className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg">Reject</button>
              <button onClick={() => onApprove?.(member.id)} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg">Approve</button>
            </>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
}