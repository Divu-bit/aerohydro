import { useWater } from '@/contexts/WaterContext';
import { Button } from '@/components/ui/button';
import { Droplets, Plus } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function QuickAddButtons() {
  const { settings, addWater } = useWater();
  const [customAmount, setCustomAmount] = useState('');
  const [open, setOpen] = useState(false);

  const handleCustomAdd = () => {
    const val = parseInt(customAmount, 10);
    if (val > 0) {
      addWater(val);
      setCustomAmount('');
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 px-4">
      {settings.cupSizes.map(size => (
        <Button
          key={size}
          variant="outline"
          onClick={() => addWater(size)}
          className="glass rounded-2xl h-14 px-5 gap-2 text-base font-semibold hover:bg-primary/10 hover:border-primary/40 active:scale-[0.97] transition-all duration-200"
        >
          <Droplets className="w-4 h-4 text-primary" />
          +{size}{settings.unit === 'oz' ? 'oz' : 'ml'}
        </Button>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="glass rounded-2xl h-14 w-14 hover:bg-primary/10 hover:border-primary/40 active:scale-[0.97] transition-all duration-200"
          >
            <Plus className="w-5 h-5 text-primary" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[320px] glass rounded-3xl">
          <DialogHeader>
            <DialogTitle>Custom Amount</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Input
              type="number"
              placeholder={`Amount in ${settings.unit}`}
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomAdd()}
              className="rounded-xl"
            />
            <Button onClick={handleCustomAdd} className="rounded-xl px-6">
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
