import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { PendingGhaatSaleGroup, GhaatSettlementType } from '../../types';
import { GhaatService } from '../../services/ghaatService';
import { formatCurrency } from '../../utils/calculations';

interface ConfirmItemData {
  transactionId: string;
  category: string;
  originalUnits: number;
  originalFineGold: number;
  purity: number;
  grossWeightPerUnit: number;
  confirmedUnits: number;
  confirmedGrossWeight: number;
  confirmedFineGold: number;
}

interface GhaatConfirmSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: PendingGhaatSaleGroup | null;
  onSaleConfirmed: () => void;
}

export const GhaatConfirmSaleModal: React.FC<GhaatConfirmSaleModalProps> = ({
  isOpen,
  onClose,
  group,
  onSaleConfirmed,
}) => {
  const [confirmItems, setConfirmItems] = useState<ConfirmItemData[]>([]);
  const [ratePer10gm, setRatePer10gm] = useState<number>(0);
  const [settlementType, setSettlementType] = useState<GhaatSettlementType>('cash');
  const [goldReturnedWeight, setGoldReturnedWeight] = useState<number>(0);
  const [goldReturnedPurity, setGoldReturnedPurity] = useState<number>(99.5);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [confirmedDate, setConfirmedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize confirm items when group changes
  React.useEffect(() => {
    if (group) {
      setConfirmItems(
        group.items.map(item => ({
          transactionId: item.id,
          category: item.category,
          originalUnits: item.units,
          originalFineGold: item.fineGold,
          purity: item.purity,
          grossWeightPerUnit: item.grossWeightPerUnit,
          confirmedUnits: item.units,
          confirmedGrossWeight: item.totalGrossWeight,
          confirmedFineGold: item.fineGold,
        }))
      );
      setRatePer10gm(0);
      setSettlementType('cash');
      setGoldReturnedWeight(0);
      setGoldReturnedPurity(99.5);
      setCashReceived(0);
      setConfirmedDate(new Date().toISOString().split('T')[0]);
    }
  }, [group]);

  const handleUnitsChange = (index: number, newUnits: number) => {
    const items = [...confirmItems];
    items[index].confirmedUnits = Math.max(0, Math.min(newUnits, items[index].originalUnits));
    items[index].confirmedGrossWeight = items[index].confirmedUnits * items[index].grossWeightPerUnit;
    items[index].confirmedFineGold = items[index].confirmedGrossWeight * items[index].purity / 100;
    setConfirmItems(items);
  };

  const calculations = useMemo(() => {
    const totalConfirmedFineGold = confirmItems.reduce((s, i) => s + i.confirmedFineGold, 0);
    const totalAmount = ratePer10gm > 0 ? totalConfirmedFineGold * ratePer10gm / 10 : 0;
    const goldReturnedFine = goldReturnedWeight * (goldReturnedPurity / 100);
    const goldValue = goldReturnedFine * ratePer10gm / 10;
    const totalReceived = (settlementType !== 'cash' ? goldValue : 0) + (settlementType !== 'gold' ? cashReceived : 0);
    const shortfall = Math.max(0, totalAmount - totalReceived);
    const returnedUnitsTotal = confirmItems.reduce(
      (s, i) => s + (i.originalUnits - i.confirmedUnits), 0
    );

    return { totalConfirmedFineGold, totalAmount, goldReturnedFine, goldValue, totalReceived, shortfall, returnedUnitsTotal };
  }, [confirmItems, ratePer10gm, settlementType, goldReturnedWeight, goldReturnedPurity, cashReceived]);

  const handleConfirm = async () => {
    if (!group || ratePer10gm <= 0) return;

    setIsSubmitting(true);
    try {
      const result = await GhaatService.confirmSale({
        groupId: group.groupId,
        confirmedItems: confirmItems.map(i => ({
          transactionId: i.transactionId,
          confirmedUnits: i.confirmedUnits,
          confirmedGrossWeight: i.confirmedGrossWeight,
          confirmedFineGold: i.confirmedFineGold,
          returnedUnits: i.originalUnits - i.confirmedUnits,
          originalPurity: i.purity,
          originalGrossWeightPerUnit: i.grossWeightPerUnit,
          originalCategory: i.category,
          originalMerchantId: group.merchantId,
          originalMerchantName: group.merchantName,
        })),
        ratePer10gm,
        settlementType,
        goldReturnedWeight: settlementType !== 'cash' ? goldReturnedWeight : undefined,
        goldReturnedPurity: settlementType !== 'cash' ? goldReturnedPurity : undefined,
        cashReceived: settlementType !== 'gold' ? cashReceived : undefined,
        confirmedDate,
      });

      if (result.error) {
        alert('Error: ' + result.error);
        return;
      }

      if (result.duesShortfall > 0) {
        alert(`Sale confirmed! Shortfall of ${formatCurrency(result.duesShortfall)} added to merchant dues.`);
      } else {
        alert('Sale confirmed and fully settled!');
      }

      onSaleConfirmed();
      onClose();
    } catch {
      alert('Unexpected error confirming sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!group) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Confirm Sale — ${group.merchantName}`} className="max-w-2xl">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto">
        {/* Section 1: Confirm Items */}
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Confirm Items</h4>
          <div className="space-y-2">
            {confirmItems.map((item, index) => (
              <div key={item.transactionId} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-mono text-xs">#{index + 1}</span>
                    <span className="text-white text-sm font-medium">{item.category}</span>
                    <span className="text-gray-400 text-xs">@ {item.purity}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block">Original Qty</span>
                    <span className="text-gray-300">{item.originalUnits} pcs</span>
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-1">Actual Qty</label>
                    <input
                      type="number"
                      min={0}
                      max={item.originalUnits}
                      value={item.confirmedUnits}
                      onChange={(e) => handleUnitsChange(index, parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 block">Orig Fine Gold</span>
                    <span className="text-gray-300">{item.originalFineGold.toFixed(3)} gm</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Actual Fine Gold</span>
                    <span className="text-yellow-400 font-medium">{item.confirmedFineGold.toFixed(3)} gm</span>
                  </div>
                </div>
                {item.confirmedUnits < item.originalUnits && (
                  <div className="mt-2 text-xs text-amber-400">
                    {item.originalUnits - item.confirmedUnits} piece(s) returned to stock
                  </div>
                )}
              </div>
            ))}
          </div>
          {calculations.returnedUnitsTotal > 0 && (
            <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-sm text-amber-400">
              Total {calculations.returnedUnitsTotal} piece(s) will be returned to your stock
            </div>
          )}
        </div>

        {/* Section 2: Rate & Total */}
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Rate & Total</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Rate per 10gm Fine Gold (₹)"
              type="number"
              step="1"
              placeholder="e.g. 72000"
              whiteBorder
              value={ratePer10gm || ''}
              onChange={(e) => setRatePer10gm(Number(e.target.value) || 0)}
            />
            <div className="flex flex-col justify-end">
              <span className="text-xs text-gray-500 mb-1">Total Amount</span>
              <span className="text-xl font-bold text-white">{formatCurrency(calculations.totalAmount)}</span>
              <span className="text-[11px] text-gray-500">
                {calculations.totalConfirmedFineGold.toFixed(3)} gm × ₹{ratePer10gm}/10gm
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Settlement */}
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Settlement</h4>

          {/* Settlement type toggle */}
          <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1 mb-4">
            {([
              { value: 'gold' as const, label: 'Full Gold' },
              { value: 'cash' as const, label: 'Full Cash' },
              { value: 'mixed' as const, label: 'Gold + Cash' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSettlementType(opt.value)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  settlementType === opt.value
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Gold return inputs */}
          {(settlementType === 'gold' || settlementType === 'mixed') && (
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Gross Gold Returned (gm)"
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  whiteBorder
                  value={goldReturnedWeight || ''}
                  onChange={(e) => setGoldReturnedWeight(Number(e.target.value) || 0)}
                />
                <Input
                  label="Purity of Returned Gold (%)"
                  type="number"
                  step="0.01"
                  placeholder="99.50"
                  whiteBorder
                  value={goldReturnedPurity || ''}
                  onChange={(e) => setGoldReturnedPurity(Number(e.target.value) || 0)}
                />
              </div>
              <div className="bg-gray-800 rounded-lg p-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Fine Gold Returned</span>
                  <p className="text-yellow-400 font-medium">{calculations.goldReturnedFine.toFixed(3)} gm</p>
                </div>
                <div>
                  <span className="text-gray-500">Gold Value at Rate</span>
                  <p className="text-white font-medium">{formatCurrency(calculations.goldValue)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cash input */}
          {(settlementType === 'cash' || settlementType === 'mixed') && (
            <div className="mb-4">
              <Input
                label="Cash Received (₹)"
                type="number"
                step="1"
                placeholder="0"
                whiteBorder
                value={cashReceived || ''}
                onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
              />
            </div>
          )}

          {/* Summary */}
          {ratePer10gm > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Due</span>
                <span className="text-white font-semibold">{formatCurrency(calculations.totalAmount)}</span>
              </div>
              {(settlementType === 'gold' || settlementType === 'mixed') && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Gold Value</span>
                  <span className="text-yellow-400 font-medium">- {formatCurrency(calculations.goldValue)}</span>
                </div>
              )}
              {(settlementType === 'cash' || settlementType === 'mixed') && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Cash Received</span>
                  <span className="text-green-400 font-medium">- {formatCurrency(cashReceived)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-700">
                <span className="text-gray-300 font-medium">
                  {calculations.shortfall > 0 ? 'Shortfall (→ Dues)' : 'Balance'}
                </span>
                <span className={`font-bold ${calculations.shortfall > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {calculations.shortfall > 0
                    ? formatCurrency(calculations.shortfall)
                    : 'Fully Settled'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Date */}
        <Input
          label="Confirmation Date"
          type="date"
          whiteBorder
          value={confirmedDate}
          onChange={(e) => setConfirmedDate(e.target.value)}
        />

        {/* Actions */}
        <div className="flex space-x-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || ratePer10gm <= 0}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600"
          >
            {isSubmitting ? 'Confirming...' : 'Confirm & Settle'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
