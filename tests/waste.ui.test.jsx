import React from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WasteDashboard from '../src/components/WasteDashboard.jsx';
import InventoryOutcome from '../src/components/InventoryOutcome.jsx';

const mock=vi.hoisted(()=>({list:vi.fn(),baseline:vi.fn(),setBaseline:vi.fn(),record:vi.fn()}));
vi.mock('../src/services/waste.js',()=>({createWasteService:()=>mock}));
beforeEach(()=>{vi.resetAllMocks();mock.list.mockResolvedValue([]);mock.baseline.mockResolvedValue(null);mock.record.mockResolvedValue('event');mock.setBaseline.mockResolvedValue();});
test('signed out has no log form; simulated dashboards are explicit and never save',async()=>{
 const user=userEvent.setup();render(<WasteDashboard/>);
 expect(screen.getByRole('link',{name:'Sign in'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Save discard'})).not.toBeInTheDocument();
 await user.selectOptions(screen.getByLabelText('Dashboard data'),'decreased');
 expect(screen.getByText(/Simulated example dashboard/)).toBeInTheDocument();expect(screen.getByText('Recorded mass is 50% lower.')).toBeInTheDocument();
 await user.selectOptions(screen.getByLabelText('Dashboard data'),'increased');expect(screen.getByText('Recorded mass is 50% higher.')).toBeInTheDocument();
 await user.selectOptions(screen.getByLabelText('Dashboard data'),'unchanged');expect(screen.getByText('Recorded mass is unchanged.')).toBeInTheDocument();
 expect(mock.record).not.toHaveBeenCalled();expect(mock.list).not.toHaveBeenCalled();
});
test('standalone save failure locks details and retries the identical operation; remount loads persisted log',async()=>{
 const user=userEvent.setup();mock.record.mockRejectedValueOnce(new Error('lost response')).mockResolvedValue('event');
 const view=render(<WasteDashboard client={{}} userId="A"/>);
 await user.type(screen.getByLabelText('Discarded food name'),'QA Apple');await user.type(screen.getByLabelText('Discarded amount'),'250');
 await user.click(screen.getByRole('button',{name:'Save discard'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Retry this unchanged request');expect(screen.getByLabelText('Discarded food name')).toBeDisabled();
 await user.click(screen.getByRole('button',{name:'Retry same discard'}));await screen.findByText(/Discard saved/);
 expect(mock.record.mock.calls[0]).toEqual(mock.record.mock.calls[1]);
 const row={id:'event',event_date:'2026-11-06',food_name:'QA Apple',category:'Fruit',quantity:250,unit:'g',reason:'Forgotten food',outcome:'Discarded'};
 view.unmount();mock.list.mockResolvedValue([row]);render(<WasteDashboard client={{}} userId="A"/>);
 expect(await screen.findByText('QA Apple')).toBeInTheDocument();expect(screen.getAllByText(/No logs/).length).toBeGreaterThan(0);
});
test('baseline is an explicit saved week, restored on reload; errors never show totals as zero',async()=>{
 const user=userEvent.setup();const view=render(<WasteDashboard client={{}} userId="A"/>);
 await user.type(screen.getByLabelText('Baseline week (choose any day)'),'2026-10-06');
 await user.click(screen.getByRole('button',{name:'Save explicit baseline week'}));await waitFor(()=>expect(mock.setBaseline).toHaveBeenCalledWith('2026-10-05'));
 view.unmount();mock.baseline.mockResolvedValue('2026-10-05');mock.list.mockRejectedValue(new Error('offline'));render(<WasteDashboard client={{}} userId="A"/>);
 expect(await screen.findByText('Could not load waste history. No totals are shown.')).toBeInTheDocument();expect(screen.queryByText('0 kg')).not.toBeInTheDocument();
 await waitFor(()=>expect(screen.getByLabelText('Baseline week (choose any day)')).toHaveValue('2026-10-05'));
});
test('linked partial discard retry preserves source, amount and request ID',async()=>{
 mock.record.mockRejectedValueOnce(new Error('offline')).mockResolvedValue('event');const user=userEvent.setup(),saved=vi.fn();
 render(<InventoryOutcome item={{id:'soup',name:'QA Soup',quantity:2,unit:'kg',category:'Prepared meals',date_type:'Not recorded'}} client={{}} userId="A" onSaved={saved}/>);
 await user.click(screen.getByRole('button',{name:'Record consumption or disposal'}));await user.selectOptions(screen.getByLabelText('Outcome'),'Discarded');await user.clear(screen.getByLabelText('Amount in kg'));await user.type(screen.getByLabelText('Amount in kg'),'0.5');await user.type(screen.getByLabelText('Disposal reason'),'Prepared too much');
 await user.click(screen.getByRole('button',{name:'Confirm outcome'}));await screen.findByRole('alert');await user.click(screen.getByRole('button',{name:'Retry same discard'}));await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
 expect(mock.record.mock.calls[0]).toEqual(mock.record.mock.calls[1]);expect(mock.record.mock.calls[0][2]).toBe('soup');expect(mock.record.mock.calls[0][0].quantity).toBe('0.5');
});
