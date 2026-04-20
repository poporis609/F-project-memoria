import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, KeyRound, Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getAuthErrorMessage, isValidPassword, getPasswordRequirements } from '../../lib/auth';
import { ConfirmPasswordResetFormData } from '../../types/auth';

// Form validation schema
const confirmPasswordResetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  code: z.string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine(isValidPassword, 'Password must contain uppercase, lowercase, number, and special character'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"],
});

interface ConfirmPasswordResetFormProps {
  initialEmail?: string;
  onSuccess?: () => void;
  onBackToForgotPassword?: () => void;
}

export function ConfirmPasswordResetForm({ 
  initialEmail = '', 
  onSuccess, 
  onBackToForgotPassword 
}: ConfirmPasswordResetFormProps) {
  const { confirmPassword, isLoading } = useAuth();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ConfirmPasswordResetFormData>({
    resolver: zodResolver(confirmPasswordResetSchema),
    defaultValues: {
      email: initialEmail,
    },
  });

  const watchedNewPassword = watch('newPassword', '');

  // Set initial email when prop changes
  useEffect(() => {
    if (initialEmail) {
      setValue('email', initialEmail);
    }
  }, [initialEmail, setValue]);

  const onSubmit = async (data: ConfirmPasswordResetFormData) => {
    try {
      setError('');
      setSuccess('');
      await confirmPassword(data.email, data.code, data.newPassword);
      setSuccess('Password reset successfully! You can now sign in with your new password.');
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    }
  };

  // Password strength indicators
  const getPasswordStrengthIndicators = (password: string) => {
    return [
      { text: 'At least 8 characters', valid: password.length >= 8 },
      { text: 'Contains uppercase letter', valid: /[A-Z]/.test(password) },
      { text: 'Contains lowercase letter', valid: /[a-z]/.test(password) },
      { text: 'Contains number', valid: /\d/.test(password) },
      { text: 'Contains special character', valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    ];
  };

  const strengthIndicators = getPasswordStrengthIndicators(watchedNewPassword);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <KeyRound className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
        <CardDescription>
          Enter the verification code from your email and choose a new password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="Enter 6-digit code"
              maxLength={6}
              {...register('code')}
              disabled={isLoading}
              className="text-center text-lg tracking-widest"
            />
            {errors.code && (
              <p className="text-sm text-red-600">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                {...register('newPassword')}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-red-600">{errors.newPassword.message}</p>
            )}
            
            {/* Password strength indicators */}
            {watchedNewPassword && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Password requirements:</p>
                {strengthIndicators.map((indicator, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    {indicator.valid ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-red-600" />
                    )}
                    <span className={indicator.valid ? 'text-green-600' : 'text-red-600'}>
                      {indicator.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmNewPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                {...register('confirmNewPassword')}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmNewPassword && (
              <p className="text-sm text-red-600">{errors.confirmNewPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting password...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>

        <div className="text-center">
          <Button
            type="button"
            variant="link"
            onClick={onBackToForgotPassword}
            className="text-sm"
          >
            Back to password reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}