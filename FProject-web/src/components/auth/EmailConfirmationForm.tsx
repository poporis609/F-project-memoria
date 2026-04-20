import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getAuthErrorMessage } from '../../lib/auth';
import { EmailConfirmationFormData } from '../../types/auth';

// Form validation schema
const confirmationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  code: z.string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});

interface EmailConfirmationFormProps {
  initialEmail?: string;
  onSuccess?: () => void;
  onBackToSignUp?: () => void;
}

export function EmailConfirmationForm({ 
  initialEmail = '', 
  onSuccess, 
  onBackToSignUp 
}: EmailConfirmationFormProps) {
  const { confirmSignUp, resendConfirmationCode, isLoading } = useAuth();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<EmailConfirmationFormData>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: {
      email: initialEmail,
    },
  });

  // Set initial email when prop changes
  useEffect(() => {
    if (initialEmail) {
      setValue('email', initialEmail);
    }
  }, [initialEmail, setValue]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const onSubmit = async (data: EmailConfirmationFormData) => {
    try {
      setError('');
      setSuccess('');
      await confirmSignUp(data.email, data.code);
      setSuccess('Email confirmed successfully! You can now sign in.');
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    }
  };

  const handleResendCode = async () => {
    const email = document.getElementById('email') as HTMLInputElement;
    if (!email?.value) {
      setError('Please enter your email address first');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await resendConfirmationCode(email.value);
      setSuccess('Verification code sent! Please check your email.');
      setResendCooldown(60); // 60 second cooldown
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-2xl font-bold">Confirm Your Email</CardTitle>
        <CardDescription>
          We've sent a verification code to your email address. 
          Please enter the 6-digit code below.
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

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              'Confirm Email'
            )}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?
          </p>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleResendCode}
            disabled={isLoading || resendCooldown > 0}
            className="w-full"
          >
            {resendCooldown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Code
              </>
            )}
          </Button>

          <div className="text-sm text-muted-foreground">
            Wrong email address?{' '}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={onBackToSignUp}
            >
              Back to sign up
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}