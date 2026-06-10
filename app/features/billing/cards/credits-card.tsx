import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@datum-cloud/datum-ui/card';

interface CreditsCardProps {
  balance: string;
  onRedeem?: () => void;
  onTopUp?: () => void;
}

export const CreditsCard = ({ balance, onRedeem, onTopUp }: CreditsCardProps) => {
  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardContent className="flex flex-col gap-2 px-5 py-4">
        <CardTitle className="text-sm font-medium">Balance</CardTitle>
        <p className="text-foreground text-2xl font-medium">{balance}</p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t px-5 py-4">
        <Button
          disabled
          htmlType="button"
          type="quaternary"
          theme="outline"
          size="xs"
          onClick={onRedeem}>
          Redeem code
        </Button>
        <Button
          disabled
          htmlType="button"
          type="quaternary"
          theme="outline"
          size="xs"
          onClick={onTopUp}>
          Top up
        </Button>
      </CardFooter>
    </Card>
  );
};
