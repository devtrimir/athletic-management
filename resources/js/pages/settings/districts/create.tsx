import { Form, Head, Link } from '@inertiajs/react';
import DistrictController from '@/actions/App/Http/Controllers/Settings/DistrictController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Create() {
    return (
        <>
            <Head title="New district" />

            <h1 className="sr-only">New district</h1>

            <div className="space-y-6">
                <Heading variant="small" title="New district" description="Add a new reference district" />

                <Form {...DistrictController.store.form()} className="max-w-xl space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="rounded-xl border bg-card p-6 space-y-5">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name_hi">Name (Hindi)</Label>
                                        <Input
                                            id="name_hi"
                                            name="name_hi"
                                            placeholder="e.g. लखनऊ"
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
                                            placeholder="e.g. Lucknow"
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.name_en} />
                                    </div>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            name="state"
                                            defaultValue="Uttar Pradesh"
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.state} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="code">Code</Label>
                                        <Input
                                            id="code"
                                            name="code"
                                            placeholder="e.g. LKO"
                                            maxLength={10}
                                            className="font-mono"
                                            required
                                        />
                                        <InputError message={errors.code} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing}>Create district</Button>
                                <Button variant="outline" asChild>
                                    <Link href={DistrictController.index.url()}>Cancel</Link>
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
            title: 'Districts',
            href: DistrictController.index.url(),
        },
        {
            title: 'New district',
        },
    ],
};
