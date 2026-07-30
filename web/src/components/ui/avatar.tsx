'use client';

import { forwardRef, useEffect, useState, type HTMLAttributes } from 'react';
import Image from 'next/image';
import { cn, getInitials, getImageUrl } from '@/lib/utils';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  shape?: 'circle' | 'square';
}

const sizeMap = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', image: 24 },
  sm: { container: 'w-8 h-8', text: 'text-xs', image: 32 },
  md: { container: 'w-10 h-10', text: 'text-sm', image: 40 },
  lg: { container: 'w-12 h-12', text: 'text-base', image: 48 },
  xl: { container: 'w-16 h-16', text: 'text-lg', image: 64 },
  '2xl': { container: 'w-20 h-20', text: 'text-xl', image: 80 },
};

const statusSizeMap = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
  '2xl': 'w-4 h-4',
};

const statusColorMap = {
  online: 'bg-success-500',
  offline: 'bg-slate-400',
  away: 'bg-amber-500',
  busy: 'bg-danger-500',
};

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt = 'Avatar',
      name,
      size = 'md',
      status,
      shape = 'circle',
      ...props
    },
    ref
  ) => {
    const { container, text, image } = sizeMap[size];
    const initials = name ? getInitials(name) : '?';

    // Resolve relative URLs (e.g. /uploads/avatar.jpg) to a full API URL so
    // next/image fetches from the API origin rather than the web origin.
    const resolvedSrc = getImageUrl(src);

    // If the image fails to load (404, broken upload, network error), fall
    // back to the initials tile instead of leaving a broken image frame.
    const [imgFailed, setImgFailed] = useState(false);
    useEffect(() => {
      // Reset failure state when the src changes so a new upload is retried.
      setImgFailed(false);
    }, [resolvedSrc]);

    // Generate consistent background color from name
    const bgColors = [
      'bg-primary-500',
      'bg-success-500',
      'bg-warning-500',
      'bg-danger-500',
      'bg-purple-500',
      'bg-cyan-500',
      'bg-pink-500',
    ];
    const colorIndex = name
      ? name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % bgColors.length
      : 0;
    const bgColor = bgColors[colorIndex];

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex shrink-0 overflow-hidden',
          container,
          // Clip the photo to the shape here so the image (or initials) always
          // meets the frame edge-to-edge with no gap, even when an outer frame
          // wraps the avatar without its own rounding.
          shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          className
        )}
        {...props}
      >
        {resolvedSrc && !imgFailed ? (
          <Image
            src={resolvedSrc}
            alt={alt}
            fill
            // `fill` makes the image absolutely positioned and stretch to the
            // container's full size, so the photo always covers the frame with
            // no gaps — regardless of the source's intrinsic aspect ratio.
            sizes={`${image}px`}
            className="object-cover"
            onError={() => setImgFailed(true)}
            unoptimized
          />
        ) : (
          <div
            className={cn(
              'w-full h-full flex items-center justify-center font-semibold text-white',
              bgColor,
              text
            )}
          >
            {initials}
          </div>
        )}
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
              statusSizeMap[size],
              statusColorMap[status]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// Avatar Group (multiple avatars stacked)
export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  avatars: Array<{
    src?: string | null;
    name?: string;
    alt?: string;
  }>;
  max?: number;
  size?: AvatarProps['size'];
}

const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    {
      className,
      avatars,
      max = 4,
      size = 'md',
      ...props
    },
    ref
  ) => {
    const displayed = avatars.slice(0, max);
    const remaining = avatars.length - max;

    const overlapClass = {
      xs: '-ml-1.5',
      sm: '-ml-2',
      md: '-ml-2.5',
      lg: '-ml-3',
      xl: '-ml-4',
      '2xl': '-ml-5',
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center', className)}
        {...props}
      >
        {displayed.map((avatar, index) => (
          <Avatar
            key={index}
            src={avatar.src}
            name={avatar.name}
            alt={avatar.alt || avatar.name || 'Avatar'}
            size={size}
            className={cn(
              'ring-2 ring-white',
              index > 0 && overlapClass[size]
            )}
          />
        ))}
        {remaining > 0 && (
          <div
            className={cn(
              'flex items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:text-slate-400 font-medium ring-2 ring-white',
              overlapClass[size],
              sizeMap[size].container,
              sizeMap[size].text
            )}
          >
            +{remaining}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup };
