import { getDictionary } from "@/lib/dictionaries";
import { Locale } from "@/dictionaries";

export default async function RagAdminPage({
    params,
}: {
    params: Promise<{ locale: Locale }>;
}) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-4">{dict.rag.title}</h1>
            <p className="text-muted-foreground mb-8">
                {dict.rag.admin}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-2">{dict.rag.upload}</h2>
                    <p className="text-muted-foreground">{dict.rag.process}</p>
                </div>

                <div className="border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-2">{dict.rag.query}</h2>
                    <p className="text-muted-foreground">{dict.common.search}</p>
                </div>
            </div>
        </div>
    );
}