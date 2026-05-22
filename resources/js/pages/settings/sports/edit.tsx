import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import SportController from '@/actions/App/Http/Controllers/Settings/SportController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'TEAM', label: 'Team' },
    { value: 'COMBAT', label: 'Combat' },
    { value: 'WATER', label: 'Water' },
] as const;

type Sport = {
    id: number;
    name_hi: string;
    name_en: string;
    category: string;
    slug: string;
};

export default function Edit({ sport }: { sport: Sport }) {
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Sports',
                href: SportController.index.url(),
            },
            {
                title: sport.name_en,
                href: SportController.edit.url(sport.id),
            },
        ],
    });

    return (
        <>
            <Head title={`Edit ${sport.name_en}`} />

            <h1 className="sr-only">Edit {sport.name_en}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={`Edit ${sport.name_en}`}
                    description="Update sport discipline details"
                />

                <Form {...SportController.update.form(sport.id)} className="space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name_hi">Name (Hindi)</Label>
                                <Input
                                    id="name_hi"
                                    name="name_hi"
                                    defaultValue={sport.name_hi}
                                    maxLength={100}
                                    required
                                />
                                <InputError message={errors.name_hi} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name_en">Name (English)</Label>
                                <Input
                                    id="name_en"
                                    name="name_en"
                                    defaultValue={sport.name_en}
                                    maxLength={100}
                                    required
                                />
                                <InputError message={errors.name_en} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Select name="category" defaultValue={sport.category} required>
                                    <SelectTrigger id="category">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.category} />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button disabled={processing}>Save changes</Button>
                                <Button variant="outline" asChild>
                                    <Link href={SportController.index.url()}>Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
