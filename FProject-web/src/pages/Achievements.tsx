import { MainLayout } from "@/components/layout/MainLayout";
import { Award, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Achievement {
  label: string;
  earned: boolean;
}

const achievements: Achievement[] = [
  { label: "\uccab \uae30\ub85d", earned: true },
  { label: "7\uc77c \uc5f0\uc18d", earned: true },
  { label: "30\uc77c \uc5f0\uc18d", earned: false },
  { label: "100\uc77c \uc5f0\uc18d", earned: false },
  { label: "1\ub144 \uc5f0\uc18d", earned: false },
  { label: "2\ub144 \uc5f0\uc18d", earned: false },
  { label: "3\ub144 \uc5f0\uc18d", earned: false },
  { label: "\uccab \uc0ac\uc9c4", earned: true },
  { label: "\uc0ac\uc9c4 10\uc7a5", earned: true },
  { label: "\uc0ac\uc9c4 30\uc7a5", earned: true },
  { label: "\uc0ac\uc9c4 50\uc7a5", earned: true },
  { label: "\uc0ac\uc9c4 100\uc7a5", earned: false },
  { label: "\uc0ac\uc9c4 200\uc7a5", earned: false },
  { label: "\uc0ac\uc9c4 300\uc7a5", earned: false },
  { label: "\uc0ac\uc9c4 400\uc7a5", earned: false },
  { label: "\uc0ac\uc9c4 500\uc7a5", earned: false },
];

const Achievements = () => {
  return (
    <MainLayout>
      <div className="min-h-screen py-12 px-4 bg-background">
        <div className="max-w-2xl mx-auto space-y-10">
          <section className="bg-card rounded-xl shadow-md border border-border p-6">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-foreground">\uc5c5\uc801 \uc804\uccb4\ubcf4\uae30</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              \uc804\uccb4 \uc5c5\uc801\uacfc \ub2ec\uc131 \uc5ec\ubd80\ub97c \ud655\uc778\ud560 \uc218 \uc788\uc5b4\uc694.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.label}
                  className={cn(
                    "rounded-lg border p-4 transition-colors",
                    achievement.earned
                      ? "bg-yellow-700/10 border-yellow-700/20"
                      : "bg-secondary/30 border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        achievement.earned
                          ? "bg-yellow-700/10 text-yellow-700"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                        {achievement.earned ? "\ub2ec\uc131" : "\ubbf8\ub2ec\uc131"}
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {achievement.label}
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          achievement.earned
                            ? "text-yellow-700"
                            : "text-muted-foreground"
                        )}
                      >
                        {achievement.earned ? "\ub2ec\uc131" : "\ubbf8\ub2ec\uc131"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
};

export default Achievements;