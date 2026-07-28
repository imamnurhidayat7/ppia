import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import {
  sendEmail,
  renderEmailLayout,
  renderEmailButton,
  renderWhatsAppButton,
  renderEmailHeading,
  renderEmailFallbackLink,
  escapeHtml,
} from '../lib/mailer';
import { getWhatsAppGroupLink } from '../lib/settings';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

interface RegisterRequest extends Request {
  body: {
    email: string;
    password: string;
    username: string;
    firstName: string;
    lastName?: string;
    phone: string;
    studentId: string;
    university: string;
    universityEmail: string;
    upi: string;
    degree: string;
    major: string;
    graduationDate: string;
    funding: string;
    consent?: boolean;
    confirmation: boolean;
    loaCoe?: string;
  };
}

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

// Register new user
export const register = async (req: RegisterRequest, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      username,
      firstName,
      lastName,
      phone,
      studentId,
      university,
      universityEmail,
      upi,
      degree,
      major,
      graduationDate,
      funding,
      consent = false,
      confirmation,
      loaCoe
    } = req.body;

    // Validation
    if (!email || !password || !username || !firstName || !phone || !studentId ||
        !university || !universityEmail || !upi || !degree || !major ||
        !graduationDate || !funding || !confirmation) {
      res.status(400).json({
        error: 'All required fields must be filled'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
          { universityEmail },
          { personalEmail: email }
        ].filter(Boolean) as any
      }
    });

    if (existingUser) {
      res.status(400).json({
        error: 'User with this email, username, or university email already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Issue the verification token here. `resendVerification` used to be the
    // only place that produced one, so a fresh registration had nothing to
    // verify against.
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user (PENDING admin approval — cannot log in until approved)
    const user = await prisma.user.create({
      data: {
        verificationToken,
        verificationExpiry,
        email,
        username,
        password: hashedPassword,
        name: `${firstName} ${lastName || ''}`.trim(),
        personalEmail: email,
        firstName,
        lastName: lastName || null,
        phone,
        studentId,
        university,
        universityEmail,
        upi,
        degree: degree as any,
        major,
        graduationDate: new Date(graduationDate),
        funding: funding as any,
        consent,
        confirmation,
        role: 'MEMBER',
        membershipStatus: 'PENDING',
        loaCoe: loaCoe || null
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        membershipStatus: true,
        divisionId: true,
        createdAt: true
      }
    });

    // Acknowledge the application and confirm the address in one message.
    // Best effort: a mail failure must not undo a completed registration.
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendEmail({
      to: email,
      subject: 'We received your PPIA Auckland registration',
      html: renderEmailLayout(
        `
        ${renderEmailHeading('Registration received')}
        <p style="margin:0 0 16px;">Hi ${escapeHtml(user.name)},</p>
        <p style="margin:0 0 16px;">Thanks for registering with PPIA Auckland. A committee member will review your application, and you'll hear from us by e-mail once it has been checked.</p>
        <p style="margin:0 0 8px;">First, please confirm this e-mail address:</p>
        ${renderEmailButton(verifyUrl, 'Confirm e-mail address')}
        ${renderEmailFallbackLink(verifyUrl)}
        <p style="margin:0;">You won't be able to sign in until your membership has been approved.</p>
      `,
        { preheader: 'Confirm your address — we have received your registration and will review it shortly.' }
      ),
      category: 'registration-received',
    });

    // No token issued — account must be approved by an admin first.
    res.status(201).json({
      message: 'Registration submitted. Your account is awaiting admin approval.',
      status: user.membershipStatus,
      user
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login user
export const login = async (req: LoginRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: email }]
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Gate login on admin approval (admins default to APPROVED)
    if (user.membershipStatus === 'PENDING') {
      res.status(403).json({
        error: 'Your registration is awaiting admin approval. Please check back later.',
        status: 'PENDING'
      });
      return;
    }

    if (user.membershipStatus === 'REJECTED') {
      res.status(403).json({
        error: user.rejectionReason
          ? `Your registration was not approved: ${user.rejectionReason}`
          : 'Your registration was not approved. Please contact the administrator.',
        status: 'REJECTED'
      });
      return;
    }

    // Generate JWT with divisionId
    const token = jwt.sign(
      { userId: user.id, role: user.role, divisionId: user.divisionId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        divisionId: user.divisionId,
        avatar: user.avatar
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - user is added by auth middleware
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        avatar: true,
        personalEmail: true,
        firstName: true,
        lastName: true,
        phone: true,
        studentId: true,
        university: true,
        universityEmail: true,
        upi: true,
        degree: true,
        major: true,
        graduationDate: true,
        funding: true,
        membershipStatus: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      name,
      avatar,
      phone,
      personalEmail,
      bio,
      linkedIn,
      instagram,
      twitter
    } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(avatar && { avatar }),
        ...(phone && { phone }),
        ...(personalEmail && { personalEmail }),
        ...(bio !== undefined && { bio }),
        ...(linkedIn !== undefined && { linkedIn }),
        ...(instagram !== undefined && { instagram }),
        ...(twitter !== undefined && { twitter })
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        personalEmail: true,
        bio: true,
        linkedIn: true,
        instagram: true,
        twitter: true
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===========================================
// PUBLIC PROFILE BY USERNAME
// ===========================================

// Public lookup: safe fields only, no email/phone/studentId
export const getPublicProfileByUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        position: true,
        avatar: true,
        bio: true,
        linkedIn: true,
        instagram: true,
        twitter: true,
        university: true,
        major: true,
        degree: true,
        createdAt: true,
        division: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
        Article: {
          where: { published: true },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            imageUrl: true,
            category: true,
            published: true,
            views: true,
            likes: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
        Research: {
          where: { published: true },
          select: {
            id: true,
            title: true,
            slug: true,
            abstract: true,
            publicationDate: true,
            researchType: true,
            published: true,
            downloadCount: true,
            viewCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
        EventRegistration: {
          where: { status: { in: ['REGISTERED', 'ATTENDED'] } },
          select: {
            id: true,
            registeredAt: true,
            status: true,
            Event: {
              select: {
                id: true,
                title: true,
                slug: true,
                startDate: true,
                location: true,
                imageUrl: true,
              },
            },
          },
          orderBy: { registeredAt: 'desc' },
          take: 6,
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Strip sensitive fields defensively before sending
    const safeUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      position: user.position,
      avatar: user.avatar,
      bio: user.bio,
      linkedIn: user.linkedIn,
      instagram: user.instagram,
      twitter: user.twitter,
      university: user.university,
      major: user.major,
      degree: user.degree,
      createdAt: user.createdAt,
      division: user.division,
      articles: user.Article,
      researches: user.Research,
      events: user.EventRegistration.map((r) => ({
        ...r.Event,
        registeredAt: r.registeredAt,
        registrationStatus: r.status,
      })),
    };

    res.json({ user: safeUser });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===========================================
// FORGOT PASSWORD
// ===========================================

interface ForgotPasswordRequest extends Request {
  body: {
    email: string;
  };
}

// Request password reset
export const forgotPassword = async (req: ForgotPasswordRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ message: 'If an account exists, a password reset link has been sent' });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Send reset email
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = renderEmailLayout(
      `
        ${renderEmailHeading('Reset your password')}
        <p style="margin:0 0 16px;">Hi ${escapeHtml(user.name)},</p>
        <p style="margin:0 0 16px;">You asked to reset your PPIA Auckland password. Use the button below to choose a new one.</p>
        ${renderEmailButton(resetUrl, 'Reset password')}
        ${renderEmailFallbackLink(resetUrl)}
        <p style="margin:0 0 16px;">This link expires in <strong>1 hour</strong> and can only be used once.</p>
        <p style="margin:0;">If you didn't request this, you can safely ignore this e-mail — your password stays unchanged.</p>
      `,
      { preheader: 'Reset your PPIA Auckland password. This link expires in 1 hour.' }
    );

    // Best effort: a provider outage must not reveal whether the address exists.
    await sendEmail({
      to: email,
      subject: 'Reset your PPIA Auckland password',
      html,
      category: 'password-reset',
    });

    res.json({ message: 'If an account exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

interface ResetPasswordRequest extends Request {
  body: {
    token: string;
    password: string;
  };
}

// Reset password with token
export const resetPassword = async (req: ResetPasswordRequest, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: 'Token and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ message: 'Password reset successful. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===========================================
// EMAIL VERIFICATION
// ===========================================

interface VerifyEmailRequest extends Request {
  body: {
    token: string;
  };
}

// Verify email with token
/**
 * The e-mail sent once an address has been confirmed.
 *
 * Carries the WhatsApp community invite, which is configured by an admin in
 * Admin → Settings rather than hard-coded — group links get rotated, and the
 * committee should not need a deploy to change one.
 *
 * When no link has been configured the message still goes out, just without the
 * invite block: confirming an address deserves an acknowledgement either way, and
 * silence would look like the confirmation failed.
 *
 * Best effort. The address is already verified in the database by this point, so
 * a mail failure must not turn a successful confirmation into an error.
 */
const sendVerifiedWelcomeEmail = async (member: {
  email: string;
  name: string;
  membershipStatus: string;
}): Promise<void> => {
  const whatsappLink = await getWhatsAppGroupLink();

  const inviteBlock = whatsappLink
    ? `
      <p style="margin:0 0 8px;">Join the PPIA Auckland WhatsApp community — that's where announcements, events and day-to-day questions happen:</p>
      ${renderWhatsAppButton(escapeHtml(whatsappLink))}
      ${renderEmailFallbackLink(escapeHtml(whatsappLink), 'Or paste this invite into your browser:')}
    `
    : `
      <p style="margin:0 0 16px;">The committee will share the WhatsApp community invite with you shortly.</p>
    `;

  // A member whose application is still being reviewed cannot sign in yet, so
  // promising them a dashboard would be misleading.
  const nextStep =
    member.membershipStatus === 'APPROVED'
      ? `<p style="margin:0;">You can sign in to the member dashboard any time at <a href="${FRONTEND_URL}/login" style="color:#E8231A;">${FRONTEND_URL}/login</a>.</p>`
      : `<p style="margin:0;">Your membership is still being reviewed by the committee. We will e-mail you again as soon as it is approved.</p>`;

  await sendEmail({
    to: member.email,
    subject: 'Your e-mail is confirmed — welcome to PPIA Auckland',
    html: renderEmailLayout(
      `
        ${renderEmailHeading('Your e-mail is confirmed')}
        <p style="margin:0 0 16px;">Hi ${escapeHtml(member.name)},</p>
        <p style="margin:0 0 16px;">Thanks for confirming your e-mail address — welcome to PPIA Auckland.</p>
        ${inviteBlock}
        ${nextStep}
      `,
      { preheader: 'Your e-mail is confirmed. Here is the WhatsApp community invite.' }
    ),
    category: 'email-verified-welcome',
  });
};

export const verifyEmail = async (req: VerifyEmailRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationExpiry: null
      }
    });

    // Welcome the member and hand over the WhatsApp invite.
    //
    // This is the moment to send it: the address is now proven to belong to the
    // person, so the invite is not going to a typo or to somebody who signed up
    // with an address they do not control.
    //
    // Clearing the token above also makes this send-once. Replaying the same
    // token no longer matches a row, so the e-mail cannot be triggered again.
    await sendVerifiedWelcomeEmail({
      email: user.email,
      name: user.name,
      membershipStatus: user.membershipStatus,
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Resend verification email
interface ResendVerificationRequest extends Request {
  body: {
    email: string;
  };
}

export const resendVerification = async (req: ResendVerificationRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.json({ message: 'If an account exists and is unverified, a verification email has been sent' });
      return;
    }

    if (user.isVerified) {
      res.json({ message: 'Email is already verified' });
      return;
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationExpiry
      }
    });

    // Send verification email
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const html = renderEmailLayout(
      `
        ${renderEmailHeading('Confirm your e-mail address')}
        <p style="margin:0 0 16px;">Hi ${escapeHtml(user.name)},</p>
        <p style="margin:0 0 16px;">Welcome to PPIA Auckland. Confirm this address to finish setting up your account.</p>
        ${renderEmailButton(verifyUrl, 'Confirm e-mail address')}
        ${renderEmailFallbackLink(verifyUrl)}
        <p style="margin:0;">This link expires in <strong>24 hours</strong>.</p>
      `,
      { preheader: 'Confirm your e-mail address to finish setting up your PPIA Auckland account.' }
    );

    const result = await sendEmail({
      to: email,
      subject: 'Confirm your PPIA Auckland e-mail address',
      html,
      category: 'email-verification',
    });

    // Unlike forgot-password there is nothing to hide here: the caller already
    // knows the address, so a delivery failure is worth reporting.
    if (!result.ok) {
      res.status(502).json({ error: 'Could not send the verification e-mail. Please try again later.' });
      return;
    }

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===========================================
// GET CURRENT USER PROFILE (EXTENDED)
// ===========================================

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        position: true,
        avatar: true,
        bio: true,
        linkedIn: true,
        instagram: true,
        twitter: true,
        personalEmail: true,
        firstName: true,
        lastName: true,
        phone: true,
        studentId: true,
        university: true,
        universityEmail: true,
        upi: true,
        degree: true,
        major: true,
        graduationDate: true,
        funding: true,
        isVerified: true,
        memberCardUrl: true,
        membershipStatus: true,
        createdAt: true,
        updatedAt: true,
        divisionId: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get event registrations
    const registrations = await prisma.eventRegistration.findMany({
      where: { userId },
      include: {
        Event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            location: true,
            imageUrl: true
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    });

    res.json({ user, registrations });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
