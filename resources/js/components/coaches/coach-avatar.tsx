import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

export function CoachAvatar({
    photoPath,
    name,
}: {
    photoPath?: string | null;
    name: string;
}) {
    const getInitials = useInitials();

    return (
        <Avatar className="size-8 rounded-md">
            {photoPath && (
                <AvatarImage
                    src={`/storage/${photoPath}`}
                    alt={name}
                    className="object-cover"
                />
            )}
            <AvatarFallback className="rounded-md text-[10px]">
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}
