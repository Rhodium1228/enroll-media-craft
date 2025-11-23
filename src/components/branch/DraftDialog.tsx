import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DraftDialogProps {
  open: boolean;
  draftTimestamp: number;
  onResume: () => void;
  onDiscard: () => void;
}

export const DraftDialog = ({
  open,
  draftTimestamp,
  onResume,
  onDiscard,
}: DraftDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Resume Draft?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have an unfinished branch enrolment from{" "}
            <strong>
              {formatDistanceToNow(new Date(draftTimestamp), { addSuffix: true })}
            </strong>
            . Would you like to resume where you left off?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Start Fresh</AlertDialogCancel>
          <AlertDialogAction onClick={onResume}>Resume Draft</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
