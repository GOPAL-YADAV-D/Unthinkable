import { Sidebar } from "@/components/sidebar"
import { TopBar } from "@/components/topbar"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ComingSoonPage({
  searchParams,
}: {
  searchParams?: { feature?: string }
}) {
  const feature = searchParams?.feature || "This feature"
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-balance">Feature coming soon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-pretty">
                {feature} is under active development. Check back soon for updates.
              </p>
              <div className="flex items-center gap-3">
                <Button asChild>
                  <Link href="/">Back to Dashboard</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/#updates">See what’s new</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
