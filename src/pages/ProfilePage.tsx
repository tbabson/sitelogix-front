import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { User, Mail, Shield, Edit2, Save } from 'lucide-react'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/utils/format'
import { useState } from 'react'

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  avatar_url: z.string().url('Enter valid URL').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const ROLE_COLORS: Record<string, string> = {
  admin: 'purple',
  supervisor: 'orange',
  client: 'blue',
  worker: 'green',
} as const

export function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [editing, setEditing] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '', avatar_url: user?.avatar_url ?? '' },
  })

  const updateMutation = useMutation({
    mutationFn: (d: FormData) => usersApi.updateMe(d),
    onSuccess: (res) => {
      updateUser(res.data.data)
      setEditing(false)
      toast.success('Profile updated')
    },
    onError: () => toast.error('Update failed'),
  })

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-orange-500 to-orange-600" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="ring-4 ring-white rounded-full">
              <Avatar name={user.name} src={user.avatar_url} size="lg" />
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={editing ? <Save size={13} /> : <Edit2 size={13} />}
              onClick={() => editing ? handleSubmit(d => updateMutation.mutate(d))() : setEditing(true)}
              loading={isSubmitting}
            >
              {editing ? 'Save' : 'Edit'}
            </Button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <Input label="Name" {...register('name')} error={errors.name?.message} />
              <Input label="Avatar URL" {...register('avatar_url')} placeholder="https://..." error={errors.avatar_url?.message} />
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <p className="text-slate-500 text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge color={(ROLE_COLORS[user.role] as 'purple' | 'orange' | 'blue' | 'green')} dot>
                  {user.role}
                </Badge>
                <Badge color={user.is_active ? 'green' : 'gray'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Account Details</h3>
        {[
          { icon: <User size={14} />, label: 'Full Name', value: user.name },
          { icon: <Mail size={14} />, label: 'Email Address', value: user.email },
          { icon: <Shield size={14} />, label: 'Role', value: user.role },
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
            <span className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
              {icon}
            </span>
            <div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-sm font-medium text-slate-800 capitalize">{value}</p>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-4 py-3">
          <span className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
            <User size={14} />
          </span>
          <div>
            <p className="text-xs text-slate-400">Member since</p>
            <p className="text-sm font-medium text-slate-800">{formatDate(user.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
