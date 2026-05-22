import { Form, Head, Link } from '@inertiajs/react';
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

export default function Create() {
    return (
        <>
            <Head title="New sport" />

            <h1 className="sr-only">New sport</h1>

            <div className="space-y-6">
                <Heading variant="small" title="New sport" description="Add a new sport discipline" />

                <Form {...SportController.store.form()} className="space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name_hi">Name (Hindi)</Label>
                                <Input
                                    id="name_hi"
                                    name="name_hi"
                                    placeholder="e.g. हॉकी"
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
                                    placeholder="e.g. Hockey"
                                    maxLength={100}
                                    required
                                />
                                <InputError message={errors.name_en} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Select name="category" required>
                                    <SelectTrigger id="category">
                                        <SelectValue placeholder="Select a category" />
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
                                <Button disabled={processing}>Create sport</Button>
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

Create.layout = {
    breadcrumbs: [
        {
            title: 'Sports',
            href: SportController.index.url(),
        },
        {
            title: 'New sport',
        },
    ],
};
