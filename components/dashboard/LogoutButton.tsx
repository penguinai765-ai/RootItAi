"use client";

import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Button from '../Button';
import React from 'react';

// Accept className and other props

type LogoutButtonProps = Omit<React.ComponentProps<typeof Button>, 'children'>;

const LogoutButton = ({ className = '', ...props }: LogoutButtonProps) => {
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    return <Button onClick={handleLogout} className={className} {...props}>Logout</Button>;
}

export default LogoutButton;
