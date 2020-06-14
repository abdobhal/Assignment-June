/**
 * This javascript file will constitute the entry point of your solution.
 *
 * Edit it as you need.  It currently contains things that you might find helpful to get started.
 */

require('./site/index.html')
require('./site/style.css')

class calculateAndDrawTable{
	/**
     * Constructor, will run before page loaded
     */
    constructor(){
    	this._declareConstants();
    	this._onDOMReady();
    }

    /**
     * Destructor, will run after page unload (or destroy)
     */
    destroy(){
        this._detachDOMListeners();

    }

    /************************************************************************************************************
     ******************************************** Internal functions ********************************************
     ************************************************************************************************************/


    /**
     * Declare class constants here
     * @private
     */
    _declareConstants(){
        this.url = "ws://localhost:8011/stomp"
		this.client = Stomp.client(this.url)
		this.destination = "/fx/prices";
		this.bidData = [];
		this.sparkLine = {};
    }

    /**
     * Caching DOM elements for performance
     * @private
     */
    _cacheDOMElements(){
        this.wrapper = document.getElementById('table-root');
    }

    /**
     * Attach EventListeners in the DOM
     * @private
     */
    _attachDOMListeners(){
    }

    /**
     * Detach EventListeners in the DOM
     * @private
     */
    _detachDOMListeners(){
    }

    /**
     * Runs on DOM Ready
     * Should be used to attach DOM listeners etc
     * @private
     */
    _onDOMReady(){
    	this._cacheDOMElements();
        this._attachDOMListeners();
        this._initializeConnection();
    }
     /************************************************************************************************************
     ****************************************** Implementation functions ****************************************
     ************************************************************************************************************/

    /**
     * Initialize connection
     * @private
     */

     _initializeConnection(){
		this.client.connect({}, (resp)=>{
			this._connectCallback();
		}, function(error) {
			alert(error.headers.message);
		});
	}
     
	/**
     * Used to populate table
     * @param sortedArray
     * @private
     */

	_populateTable(sortedArray){
		let rowData = [];

		for(let i=0;i<sortedArray.length;i++){
			rowData.push("<ul>");
			rowData.push("<li>" +sortedArray[i].name+ "</li>");
			rowData.push("<li>" +sortedArray[i].bestBid+ "</li>");
			rowData.push("<li>" +sortedArray[i].bestAsk+ "</li>");
			rowData.push("<li>" +sortedArray[i].lastChangeBid+ "</li>");
			rowData.push("<li>" +sortedArray[i].lastChangeAsk+ "</li>");
			rowData.push("<td><span id=" + sortedArray[i].name + "></span></td>");
			rowData.push("</ul>");
		}
		this.wrapper.innerHTML = rowData.join("");

		this._sparkLineGenerator(sortedArray);
		
		
	}

	/**
     * Used to generate Spark lines
     * @param arr
     * @private
     */

	_sparkLineGenerator(arr){
		for(let i=0;i<arr.length;i++){
			let el = document.getElementById(arr[i].name);

		   	if(!this.sparkLine[arr[i].name]){
			    this.sparkLine[arr[i].name] = {};
			    this.sparkLine[arr[i].name]["values"] = []; 
			    this.sparkLine[arr[i].name]["spark"] = new Sparkline(el)
		   	}

		   // Calculates the average of best Bid and best Ask
		   const avg = (arr[i].bestBid + arr[i].bestAsk) / 2;

		   this.sparkLine[arr[i].name]["values"].push(avg);

		   // Draw
		   Sparkline.draw(el, this.sparkLine[arr[i].name]["values"]);
		}
		
	}


	/**
     * Used to sort the bidData Array on the basis of Best Bid.
     * @private
     */

	_sortByBestBid(){
		const sortedArr = this.bidData.sort((a,b)=>{
		    return (a.bestBid > b.bestBid) ? 1 : ((b.bestBid > a.bestBid) ? -1 : 0);
		});

		// Now populate the table with Sorted Arr
		this._populateTable(sortedArr);
	}

	_insertNewElements(rowData, index){
		let indexedUl = this.wrapper.querySelectorAll("ul")[index];

		indexedUl.querySelectorAll('li')[1].innerHTML = rowData.bestBid;
		indexedUl.querySelectorAll('li')[2].innerHTML = rowData.bestAsk;
		indexedUl.querySelectorAll('li')[3].innerHTML = rowData.lastChangeBid;
		indexedUl.querySelectorAll('li')[4].innerHTML = rowData.lastChangeAsk;
	}

	_swapRowsAndInsertElements(rowData, index, targerIndex){
		let indexedUl = this.wrapper.querySelectorAll("ul")[index],
			nextIndexedUl = this.wrapper.querySelectorAll("ul")[targerIndex];

		indexedUl.querySelectorAll('li')[1].innerHTML = rowData.bestBid;
		indexedUl.querySelectorAll('li')[2].innerHTML = rowData.bestAsk;
		indexedUl.querySelectorAll('li')[3].innerHTML = rowData.lastChangeBid;
		indexedUl.querySelectorAll('li')[4].innerHTML = rowData.lastChangeAsk;
		this.wrapper.insertBefore(indexedUl,nextIndexedUl);
	}

	/**
     * Called when the incoming data is already present in table and updation is required.
     * @param rowData
     * @private
     */

	_updateRow(rowData){
		let index = this.bidData.findIndex(element => element.name === rowData.name ),
			length = this.wrapper.querySelectorAll("ul").length;

		this.bidData[index] = rowData;

		if(this.wrapper.querySelectorAll("ul")[index+1]){
			if(this.wrapper.querySelectorAll("ul")[index+1].querySelectorAll('li')[1].innerHTML > rowData.bestBid){
				this._insertNewElements(rowData, index);
			} else {
				//  Check recurssively till it satisfies the condition
				for(let i=1;i<length;i++){
					if(this.wrapper.querySelectorAll("ul")[index+i].querySelectorAll('li')[1].innerHTML < rowData.bestBid){
						// Pass, Go to next iteration
					} else {
						// Now track the new index before which we need to append.
						this._swapRowsAndInsertElements(rowData, index, index+i);
						const sortedArr = this.bidData.sort((a,b)=>{
						    return (a.bestBid > b.bestBid) ? 1 : ((b.bestBid > a.bestBid) ? -1 : 0);
						});
						break;
					}
				}
				
			}
		} else {
			this._insertNewElements(rowData, index);
		}
		this._sparkLineGenerator(this.bidData);
	}
		

	/**
     * Callback for Connect
     * @private
     */

	_connectCallback() {
		var subscription = this.client.subscribe(this.destination, (message) => {
		  	if (message.body) {
		      const data = JSON.parse(message.body);

		      // Check if required data is coming in response
		      if(data.name && data.bestBid && data.bestAsk && data.lastChangeBid && data.lastChangeAsk){
		     	// Checks if Bid Data is already present or not 	
		      	if(!this.bidData.length) {
			      	this.bidData.push(data);
			      	this._populateTable(data);
				} else{
						// check for finding if data with name is already present in table.
						let isDuplicate = this.bidData.find((item) => item.name === data.name);

						if(isDuplicate){
							// Row is already present in the table, let's update the row!
							this._updateRow(data);
						}else {
							this.bidData.push(data);
							this._sortByBestBid();
						}
			    	} 
		      	}else{
			      	throw new Error("Response Invalid");
			   	}
		  	} else {
		      alert("got empty message");
		    }
	  	});
	}

}

let init = new calculateAndDrawTable();