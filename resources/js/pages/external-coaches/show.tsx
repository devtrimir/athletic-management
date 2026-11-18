import { Head, Link } from '@inertiajs/react';
import { Download, List, Pencil, UserRound } from 'lucide-react';

import { DocumentViewer } from '@/components/external-coaches/document-viewer';
import type { CoachDocument } from '@/components/external-coaches/document-viewer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';
import { formatDate } from '@/lib/dates';
import { documentTypeLabel } from '@/lib/external-coach-documents';

type ExternalCoach = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    experience_years: number | null;
    status: string;
    remarks: string | null;
    active_assignments_count: number;
    photo_path: string | null;
    sports: { id: number; name: string }[];
    training_venues: { id: number; name: string }[];
    documents: CoachDocument[];
    status_history?: Array<{
        id: number;
        status: string;
        reason: string | null;
        recorded_at: string;
        recorded_by?: { name: string } | null;
    }>;
};

type Props = {
    externalCoach: ExternalCoach;
};

export default function ExternalCoachesShow({ externalCoach }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={externalCoach.name} />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="size-14 border">
                            {externalCoach.photo_path && (
                                <AvatarImage
                                    src={`/storage/${externalCoach.photo_path}`}
                                    alt={externalCoach.name}
                                    className="object-cover"
                                />
                            )}
                            <AvatarFallback>
                                <UserRound className="size-6 text-muted-foreground/60" />
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">
                                {externalCoach.name}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {externalCoach.email}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <Link href="/external-coaches">{t('Back')}</Link>
                        </Button>
                        <Button asChild>
                            <Link
                                href={`/external-coaches/${externalCoach.id}/edit`}
                            >
                                <Pencil className="mr-2 size-4" />
                                {t('Edit')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="details">
                    <TabsList className="w-fit">
                        <TabsTrigger value="details" asChild>
                            <Link
                                href={`/external-coaches/${externalCoach.id}`}
                            >
                                {t('Details')}
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="assignments" asChild>
                            <Link
                                href={`/external-coaches/${externalCoach.id}/assignments`}
                            >
                                <List className="mr-2 size-4" />
                                {t('Assignments')}
                            </Link>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4">
                        <section className="rounded-lg border bg-card p-5">
                            <div className="mb-4">
                                <Badge variant="outline">
                                    {t(externalCoach.status)}
                                </Badge>
                            </div>
                            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <dt className="text-muted-foreground">
                                        {t('Phone')}
                                    </dt>
                                    <dd>{externalCoach.phone ?? '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        {t('City')}
                                    </dt>
                                    <dd>{externalCoach.city ?? '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        {t('Experience')}
                                    </dt>
                                    <dd>
                                        {externalCoach.experience_years ?? '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        {t('Active players coached')}
                                    </dt>
                                    <dd>
                                        {externalCoach.active_assignments_count}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        {t('Sports')}
                                    </dt>
                                    <dd>
                                        {externalCoach.sports
                                            .map((sport) => sport.name)
                                            .join(', ') || '-'}
                                    </dd>
                                </div>
                                <div className="sm:col-span-2">
                                    <dt className="text-muted-foreground">
                                        {t('Training venues')}
                                    </dt>
                                    <dd>
                                        {externalCoach.training_venues
                                            .map((venue) => venue.name)
                                            .join(', ') || '-'}
                                    </dd>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3">
                                    <dt className="text-muted-foreground">
                                        {t('Documents')}
                                    </dt>
                                    <dd className="flex flex-wrap gap-2">
                                        {externalCoach.documents.length === 0
                                            ? '-'
                                            : externalCoach.documents.map(
                                                  (document) => (
                                                      <span
                                                          key={document.id}
                                                          className="inline-flex items-center gap-1 rounded-md border py-0.5 pr-0.5 pl-2"
                                                      >
                                                          {documentTypeLabel(
                                                              document.type,
                                                              t,
                                                          )}{' '}
                                                          ·{' '}
                                                          {
                                                              document.original_name
                                                          }
                                                          <DocumentViewer
                                                              coachId={
                                                                  externalCoach.id
                                                              }
                                                              document={
                                                                  document
                                                              }
                                                          />
                                                          <Button
                                                              asChild
                                                              variant="ghost"
                                                              size="icon"
                                                              title={t(
                                                                  'Download',
                                                              )}
                                                          >
                                                              <a
                                                                  href={`/external-coaches/${externalCoach.id}/documents/${document.id}?download=1`}
                                                              >
                                                                  <Download className="size-4" />
                                                              </a>
                                                          </Button>
                                                      </span>
                                                  ),
                                              )}
                                    </dd>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3">
                                    <dt className="text-muted-foreground">
                                        {t('Remarks')}
                                    </dt>
                                    <dd>{externalCoach.remarks ?? '-'}</dd>
                                </div>
                            </dl>
                        </section>

                        <section className="rounded-lg border bg-card p-5">
                            <h2 className="mb-3 text-base font-semibold">
                                {t('Status history')}
                            </h2>
                            <div className="space-y-2 text-sm">
                                {externalCoach.status_history &&
                                externalCoach.status_history.length > 0 ? (
                                    externalCoach.status_history.map(
                                        (entry) => (
                                            <div
                                                key={entry.id}
                                                className="rounded-md border p-2"
                                            >
                                                <div className="font-medium">
                                                    {t(entry.status)}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {formatDate(
                                                        entry.recorded_at,
                                                        '-',
                                                    )}{' '}
                                                    •{' '}
                                                    {entry.recorded_by?.name ??
                                                        t('System')}
                                                </div>
                                                <div>{entry.reason ?? '-'}</div>
                                            </div>
                                        ),
                                    )
                                ) : (
                                    <div className="text-muted-foreground">
                                        {t('No status history found.')}
                                    </div>
                                )}
                            </div>
                        </section>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
