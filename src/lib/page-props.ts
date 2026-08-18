export type IdPageProps = {
  params: Promise<{ id: string }>;
};

export type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
