import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateMe, type UpdateMeRequest } from '@/lib/api/users'
import { getApiErrorMessage } from '@/lib/error-messages'
import { forceRefreshToken } from '@/lib/auth'

export function useUpdateMyProfile() {
    return useMutation({
        mutationFn: (data: UpdateMeRequest) => updateMe(data),
        onSuccess: async () => {
            try {
                await forceRefreshToken()
            } catch {
                // Token refresh failure won't block the mutation;
                // user will pick up fresh claims on next request cycle
            }
            toast.success('Profile updated.')
        },
        onError: (error) => {
            toast.error('Failed to update profile', {
                description: getApiErrorMessage(error),
            })
        },
    })
}
